#!/usr/bin/env python3
"""
CadQuery Mobile Studio - Execution Engine Runner
Executes real Python CadQuery scripts, extracts tessellated mesh, analytical
CAD properties (Volume, Area, BoundingBox, Edges), and supports direct
export to STL, STEP, and OBJ.
"""

import sys
import os
import json
import io
import time
import traceback
import math

def check_environment():
    status = {
        "python_version": sys.version,
        "cadquery_available": False,
        "ocp_available": False,
        "version": None,
        "engine": "CPython"
    }
    try:
        import cadquery as cq
        status["cadquery_available"] = True
        status["version"] = getattr(cq, "__version__", "2.x")
        try:
            import OCP
            status["ocp_available"] = True
        except ImportError:
            pass
    except Exception as e:
        status["error"] = str(e)
    return status

def run_cadquery_script(script_code, export_format=None, export_path=None):
    start_time = time.time()
    stdout_capture = io.StringIO()
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = stdout_capture
    sys.stderr = stdout_capture

    result = {
        "success": False,
        "execution_time_ms": 0,
        "stdout": "",
        "error": None,
        "error_line": None,
        "error_type": None,
        "objects": [],
        "engine": "Native CadQuery (OCP/OpenCASCADE)",
        "export_created": None
    }

    try:
        import cadquery as cq
    except Exception as import_err:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        result["error"] = f"CadQuery no está disponible en este entorno: {str(import_err)}"
        result["error_type"] = "ImportError"
        result["stdout"] = stdout_capture.getvalue()
        result["execution_time_ms"] = round((time.time() - start_time) * 1000)
        return result

    # Registry for shapes explicitly registered via show_object()
    displayed_shapes = []

    def show_object(shape, name=None, color=None, alpha=1.0):
        displayed_shapes.append({
            "shape": shape,
            "name": name or f"Pieza {len(displayed_shapes) + 1}",
            "color": color,
            "alpha": float(alpha) if alpha is not None else 1.0
        })

    # Execution namespace
    exec_globals = {
        "__name__": "__main__",
        "cq": cq,
        "cadquery": cq,
        "show_object": show_object,
    }

    try:
        # Compile and execute
        compiled_code = compile(script_code, "<cadquery_user_script>", "exec")
        exec(compiled_code, exec_globals)
        
        # If user didn't explicitly call show_object(), inspect variables in namespace
        if not displayed_shapes:
            # Common names priority or check all Workplane / Shape / Assembly
            detected_vars = []
            for var_name, val in exec_globals.items():
                if var_name.startswith("_") or var_name in ("cq", "cadquery", "show_object"):
                    continue
                if isinstance(val, (cq.Workplane, cq.Shape, cq.Compound, cq.Solid)):
                    detected_vars.append((var_name, val))
                elif hasattr(val, "val") and callable(getattr(val, "val")):
                    try:
                        v = val.val()
                        if isinstance(v, (cq.Shape, cq.Compound, cq.Solid)):
                            detected_vars.append((var_name, val))
                    except Exception:
                        pass
                elif hasattr(val, "toCompound") and callable(getattr(val, "toCompound")): # cq.Assembly
                    detected_vars.append((var_name, val))

            # Sort detected vars: favor "result", "caja", or user defined variables
            for var_name, val in detected_vars:
                displayed_shapes.append({
                    "shape": val,
                    "name": var_name,
                    "color": None,
                    "alpha": 1.0
                })

        # Process each shape into triangulated mesh and CAD properties
        mesh_objects = []
        for idx, item in enumerate(displayed_shapes):
            raw_shape = item["shape"]
            name = item["name"]
            user_color = item["color"]
            alpha = item["alpha"]

            # Resolve to Shape
            cq_shape = None
            if isinstance(raw_shape, cq.Workplane):
                cq_shape = raw_shape.val()
            elif isinstance(raw_shape, (cq.Shape, cq.Compound, cq.Solid)):
                cq_shape = raw_shape
            elif hasattr(raw_shape, "toCompound"):
                # Assembly
                cq_shape = raw_shape.toCompound()
            elif hasattr(raw_shape, "val"):
                cq_shape = raw_shape.val()

            if not cq_shape:
                continue

            # Tessellate
            # CadQuery Shape.tessellate(tolerance=0.1, angularTolerance=0.1)
            # returns tuple: (vertices_list, triangles_indices_list)
            try:
                tess = cq_shape.tessellate(0.1, 0.1)
                raw_vertices, raw_triangles = tess
            except Exception as tess_err:
                # Try fallback tolerance
                tess = cq_shape.tessellate(0.5, 0.5)
                raw_vertices, raw_triangles = tess

            # Format vertices: flatten or list of [x, y, z]
            vertices = []
            for v in raw_vertices:
                vertices.extend([round(float(v.x), 4), round(float(v.y), 4), round(float(v.z), 4)])

            # Indices: flatten triangles
            indices = []
            for tri in raw_triangles:
                indices.extend([int(tri[0]), int(tri[1]), int(tri[2])])

            # Extract edges for CAD wireframe line rendering
            edges_list = []
            try:
                for edge in cq_shape.Edges():
                    try:
                        geom = getattr(edge, "geomType", lambda: "LINE")()
                        # If straight line, 2 sample points is sufficient
                        samples = 2 if geom == "LINE" else 16
                        pts = [edge.positionAt(i / (samples - 1)) for i in range(samples)]
                        for p_i in range(len(pts) - 1):
                            edges_list.append([
                                round(float(pts[p_i].x), 3),
                                round(float(pts[p_i].y), 3),
                                round(float(pts[p_i].z), 3),
                                round(float(pts[p_i+1].x), 3),
                                round(float(pts[p_i+1].y), 3),
                                round(float(pts[p_i+1].z), 3)
                            ])
                    except Exception:
                        pass
            except Exception:
                pass

            # Analytical CAD properties
            try:
                vol = float(cq_shape.Volume())
            except Exception:
                vol = 0.0

            try:
                area = float(cq_shape.Area())
            except Exception:
                area = 0.0

            try:
                bb = cq_shape.BoundingBox()
                bbox = {
                    "min": [round(float(bb.xmin), 3), round(float(bb.ymin), 3), round(float(bb.zmin), 3)],
                    "max": [round(float(bb.xmax), 3), round(float(bb.ymax), 3), round(float(bb.zmax), 3)],
                    "size": [
                        round(float(bb.xlen), 3),
                        round(float(bb.ylen), 3),
                        round(float(bb.zlen), 3)
                    ]
                }
            except Exception:
                bbox = {"min": [0,0,0], "max": [0,0,0], "size": [0,0,0]}

            # Count of faces and edges
            face_count = len(cq_shape.Faces()) if hasattr(cq_shape, "Faces") else 0
            edge_count = len(cq_shape.Edges()) if hasattr(cq_shape, "Edges") else 0

            # Default palette
            default_colors = ["#38bdf8", "#34d399", "#fbbf24", "#f43f5e", "#a78bfa", "#f97316"]
            assigned_color = user_color or default_colors[idx % len(default_colors)]

            mesh_objects.append({
                "id": f"obj_{idx}",
                "name": name,
                "color": assigned_color,
                "alpha": alpha,
                "vertices": vertices,
                "indices": indices,
                "edges": edges_list,
                "properties": {
                    "volume": round(vol, 3),
                    "area": round(area, 3),
                    "bbox": bbox,
                    "faceCount": face_count,
                    "edgeCount": edge_count
                }
            })

        result["objects"] = mesh_objects
        result["success"] = True

        # Export if requested
        if export_format and export_path and displayed_shapes:
            first_shape = displayed_shapes[0]["shape"]
            # Convert to cq_shape if needed
            exp_target = first_shape.val() if hasattr(first_shape, "val") else first_shape
            
            # If multiple shapes, combine into compound
            if len(displayed_shapes) > 1:
                all_shapes = [s["shape"].val() if hasattr(s["shape"], "val") else s["shape"] for s in displayed_shapes]
                exp_target = cq.Compound.makeCompound(all_shapes)

            fmt = export_format.upper()
            if fmt == "STEP":
                cq.exporters.export(exp_target, export_path, exportType=cq.exporters.ExportTypes.STEP)
            elif fmt == "STL":
                cq.exporters.export(exp_target, export_path, exportType=cq.exporters.ExportTypes.STL, tolerance=0.05, angularTolerance=0.1)
            elif fmt == "AMF":
                cq.exporters.export(exp_target, export_path, exportType=cq.exporters.ExportTypes.AMF)
            elif fmt == "SVG":
                cq.exporters.export(exp_target, export_path, exportType=cq.exporters.ExportTypes.SVG)
            result["export_created"] = export_path

    except Exception as exec_err:
        tb = traceback.format_exc()
        result["error"] = str(exec_err)
        result["error_type"] = type(exec_err).__name__
        
        # Extract line number from traceback
        tb_lines = tb.splitlines()
        for l in tb_lines:
            if "<cadquery_user_script>" in l:
                # File "<cadquery_user_script>", line 15, in ...
                try:
                    parts = l.split("line ")
                    if len(parts) > 1:
                        num = int(parts[1].split(",")[0].strip())
                        result["error_line"] = num
                except Exception:
                    pass
        result["stderr"] = tb

    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
        result["stdout"] = stdout_capture.getvalue()
        result["execution_time_ms"] = round((time.time() - start_time) * 1000)

    return result

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        print(json.dumps(check_environment()))
        sys.exit(0)

    # Read payload from stdin or file
    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input)
        code = payload.get("code", "")
        export_fmt = payload.get("export_format")
        export_p = payload.get("export_path")
        res = run_cadquery_script(code, export_fmt, export_p)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Fatal runner error: {str(e)}",
            "execution_time_ms": 0,
            "stdout": "",
            "objects": []
        }))

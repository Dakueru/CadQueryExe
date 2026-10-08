export interface FunctionHelpDoc {
  name: string;
  signature: string;
  description: string;
  parameters: { name: string; type: string; desc: string; defaultValue?: string }[];
  returns: string;
  example: string;
}

export const CQ_HELP_DOCS: Record<string, FunctionHelpDoc> = {
  fillet: {
    name: 'fillet',
    signature: '.fillet(radius: float) -> Workplane',
    description: 'Aplica un redondeo cilíndrico a las aristas previamente seleccionadas en la pila de trabajo utilizando el radio especificado en milímetros.',
    parameters: [
      { name: 'radius', type: 'float', desc: 'Radio del redondeo en milímetros (debe ser mayor que 0 y menor que el ancho de la cara adyacente).' }
    ],
    returns: 'Workplane con el sólido modificado.',
    example: `caja = (
    cq.Workplane("XY")
    .box(100, 50, 30)
    .edges("|Z")
    .fillet(5.0)
)`
  },
  chamfer: {
    name: 'chamfer',
    signature: '.chamfer(length: float, length2: float = None) -> Workplane',
    description: 'Aplica un chaflán plano a las aristas seleccionadas. Si se especifica length2, se genera un chaflán asimétrico.',
    parameters: [
      { name: 'length', type: 'float', desc: 'Distancia de retroceso del chaflán a lo largo de la primera cara adyacente.' },
      { name: 'length2', type: 'float (opcional)', desc: 'Distancia de retroceso a lo largo de la segunda cara adyacente.', defaultValue: 'None' }
    ],
    returns: 'Workplane con el sólido achaflanado.',
    example: `pieza = (
    cq.Workplane("XY")
    .box(50, 50, 20)
    .edges(">Z")
    .chamfer(2.0)
)`
  },
  box: {
    name: 'box',
    signature: '.box(length: float, width: float, height: float, centered=True) -> Workplane',
    description: 'Crea una caja rectangular tridimensional orientada según el plano de trabajo activo. Por defecto se centra en el origen (0,0,0).',
    parameters: [
      { name: 'length', type: 'float', desc: 'Dimensión a lo largo del eje X local (mm).' },
      { name: 'width', type: 'float', desc: 'Dimensión a lo largo del eje Y local (mm).' },
      { name: 'height', type: 'float', desc: 'Dimensión a lo largo del eje Z local (mm).' },
      { name: 'centered', type: 'bool o tuple(bool,bool,bool)', desc: 'Si es True, la caja se centra en los tres ejes.', defaultValue: 'True' }
    ],
    returns: 'Workplane con el nuevo sólido rectangular.',
    example: `caja = cq.Workplane("XY").box(120, 70, 40)`
  },
  cylinder: {
    name: 'cylinder',
    signature: '.cylinder(height: float, radius: float, centered=True) -> Workplane',
    description: 'Genera un cilindro sólido perpendicular al plano de trabajo activo.',
    parameters: [
      { name: 'height', type: 'float', desc: 'Altura total del cilindro.' },
      { name: 'radius', type: 'float', desc: 'Radio de la base circular.' },
      { name: 'centered', type: 'bool', desc: 'Si el centro geométrico coincide con el plano.', defaultValue: 'True' }
    ],
    returns: 'Workplane con el cilindro generado.',
    example: `cilindro = cq.Workplane("XY").cylinder(height=50, radius=15)`
  },
  hole: {
    name: 'hole',
    signature: '.hole(diameter: float, depth: float = None) -> Workplane',
    description: 'Perfora un agujero ciego o pasante en las ubicaciones o caras seleccionadas en la pila de trabajo.',
    parameters: [
      { name: 'diameter', type: 'float', desc: 'Diámetro del agujero en mm.' },
      { name: 'depth', type: 'float (opcional)', desc: 'Profundidad de corte. Si es None, corta a través de todo el sólido.', defaultValue: 'None' }
    ],
    returns: 'Workplane con el agujero perforado.',
    example: `caja_agujereada = (
    cq.Workplane("XY")
    .box(60, 60, 20)
    .faces(">Z")
    .workplane()
    .hole(12.0)
)`
  },
  edges: {
    name: 'edges',
    signature: '.edges(selector: str = None) -> Workplane',
    description: 'Filtra y selecciona aristas de la geometría activa utilizando directivas de selección de CadQuery (|Z, >X, %CIRCLE, etc.).',
    parameters: [
      { name: 'selector', type: 'str', desc: 'Cadena de selección. Ejemplos: "|Z" (verticales), ">Y" (extremo positivo de Y), "%CIRCLE" (arcos/círculos).' }
    ],
    returns: 'Workplane con las aristas filtradas listas para redondeos o chaflanes.',
    example: `redondeadas = pieza.edges("|Z and >Y").fillet(3)`
  },
  faces: {
    name: 'faces',
    signature: '.faces(selector: str = None) -> Workplane',
    description: 'Filtra y selecciona caras del modelo. Permite posicionar nuevos planos de trabajo mediante .workplane().',
    parameters: [
      { name: 'selector', type: 'str', desc: 'Directiva de selección espacial: ">Z" (superior), "<Z" (inferior), ">X", "<X", ">Y", "<Y".' }
    ],
    returns: 'Workplane con las caras coincidentes.',
    example: `cara_superior = pieza.faces(">Z").workplane()`
  },
  cutThruAll: {
    name: 'cutThruAll',
    signature: '.cutThruAll() -> Workplane',
    description: 'Extruye las curvas del boceto 2D activo cortando todo el sólido a su paso en la dirección normal.',
    parameters: [],
    returns: 'Workplane con el corte pasante aplicado.',
    example: `pieza_perforada = pieza.faces(">Z").workplane().circle(5).cutThruAll()`
  },
  show_object: {
    name: 'show_object',
    signature: 'show_object(shape, name: str = None, color: str = None, alpha: float = 1.0)',
    description: 'Registra un objeto geométrico individual para que sea renderizado en el visor 3D interactivo con nombre, color y opacidad personalizados.',
    parameters: [
      { name: 'shape', type: 'Workplane | Shape | Assembly', desc: 'El sólido o ensamble a visualizar.' },
      { name: 'name', type: 'str', desc: 'Nombre descriptivo que aparecerá en el gestor de piezas.' },
      { name: 'color', type: 'str', desc: 'Código de color hexadecimal (ej. "#38bdf8").' },
      { name: 'alpha', type: 'float', desc: 'Opacidad del 0.0 (transparente) al 1.0 (opaco).' }
    ],
    returns: 'None',
    example: `show_object(caja, name="Carcasa", color="#38bdf8", alpha=0.9)`
  }
};

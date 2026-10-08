export interface TemplateItem {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const CADQUERY_TEMPLATES: TemplateItem[] = [
  {
    id: 'basic_box',
    name: 'Caja con Redondeos (Básico)',
    description: 'Sólido elemental con redondeo en aristas verticales Z y selector de caras.',
    code: `import cadquery as cq

# Dimensiones principales (mm)
largo = 120
ancho = 70
alto = 40
radio = 5

# Generación del modelo
caja = (
    cq.Workplane("XY")
    .box(largo, ancho, alto)
    .edges("|Z")
    .fillet(radio)
)

print(f"Caja generada: {largo}x{ancho}x{alto} mm con redondeo R{radio}")
`
  },
  {
    id: 'parametric_flange',
    name: 'Brida Paramétrica (Mecánica)',
    description: 'Brida circular con agujero central, patrón de pernos radiales y chaflanes.',
    code: `import cadquery as cq

# Parámetros geométricos
diametro_exterior = 140
diametro_interior = 50
espesor = 20
radio_pernos = 50
num_pernos = 6
diametro_perno = 10
chaflan = 2

# Construcción de la brida
brida = (
    cq.Workplane("XY")
    .circle(diametro_exterior / 2)
    .circle(diametro_interior / 2)
    .extrude(espesor)
    .faces(">Z")
    .workplane()
    .polarArray(radio_pernos, 0, 360, num_pernos)
    .circle(diametro_perno / 2)
    .cutThruAll()
    .edges("|Z and (not <Z)")
    .fillet(1.5)
    .faces("<Z or >Z")
    .edges("%CIRCLE")
    .chamfer(chaflan)
)

print(f"Brida creada con {num_pernos} pernos en R{radio_pernos} mm")
`
  },
  {
    id: 'multi_piece_assembly',
    name: 'Ensamblaje Multi-Pieza (Tornillo y Tuerca)',
    description: 'Demuestra show_object() para visualizar varias piezas independientes con distintos colores.',
    code: `import cadquery as cq

# Pieza 1: Tornillo M12
cabeza_diam = 22
cabeza_alto = 10
vastago_diam = 12
vastago_largo = 60

tornillo = (
    cq.Workplane("XY")
    .polygon(6, cabeza_diam)
    .extrude(cabeza_alto)
    .faces(">Z")
    .workplane()
    .circle(vastago_diam / 2)
    .extrude(vastago_largo)
    .edges(">Z")
    .chamfer(1.0)
)

# Pieza 2: Tuerca M12 posicionada a lo largo del vástago
tuerca = (
    cq.Workplane("XY")
    .polygon(6, cabeza_diam)
    .circle(vastago_diam / 2)
    .extrude(12)
    .translate((0, 0, 30))
    .edges("%CIRCLE")
    .chamfer(1.0)
)

# Mostrar ambas piezas explícitamente con colores diferenciados
show_object(tornillo, name="Tornillo_M12", color="#38bdf8", alpha=1.0)
show_object(tuerca, name="Tuerca_M12", color="#fbbf24", alpha=0.95)

print("Ensamblaje de tornillo y tuerca generado exitosamente.")
`
  },
  {
    id: 'boolean_operations',
    name: 'Operaciones Booleanas Complejas',
    description: 'Unión, corte e intersección entre un cubo base, esferas y cilindros cruzados.',
    code: `import cadquery as cq

tamano = 60
radio_esfera = 38
diam_taladro = 28

# Cubo base
cubo = cq.Workplane("XY").box(tamano, tamano, tamano)

# Esfera para intersección
esfera = cq.Workplane("XY").sphere(radio_esfera)

# Intersección de cubo y esfera
nucleo = cubo.intersect(esfera)

# Taladros pasantes en los 3 ejes cartesianos (X, Y, Z)
resultado = (
    nucleo
    .faces(">Z").workplane().circle(diam_taladro / 2).cutThruAll()
    .faces(">X").workplane().circle(diam_taladro / 2).cutThruAll()
    .faces(">Y").workplane().circle(diam_taladro / 2).cutThruAll()
    .edges()
    .fillet(1.5)
)

print(f"Sólido booleano generado con 3 taladros ortogonales d={diam_taladro} mm")
`
  },
  {
    id: 'stepper_mount',
    name: 'Soporte Motor Paso a Paso NEMA 17',
    description: 'Pieza de ingeniería mecánica para montaje de motores NEMA17 con ranuras de fijación.',
    code: `import cadquery as cq

lado = 42.3
espesor = 6
piloto_diam = 22.0
dist_taladros = 31.0
diam_tornillo = 3.2
altura_soporte = 35

soporte = (
    cq.Workplane("XY")
    .box(lado, lado, espesor)
    # Agujero piloto central
    .faces(">Z").workplane()
    .hole(piloto_diam)
    # Taladros de fijación del motor en las 4 esquinas
    .faces(">Z").workplane()
    .rect(dist_taladros, dist_taladros, forConstruction=True)
    .vertices()
    .hole(diam_tornillo)
    # Aleta de montaje lateral
    .faces("<Y").workplane()
    .transformed(offset=cq.Vector(0, 0, altura_soporte/2 - espesor/2))
    .box(lado, altura_soporte, espesor)
    # Chaflanes en bordes externos
    .edges("|Z and >Y")
    .chamfer(3.0)
)

print("Soporte NEMA 17 generado.")
`
  },
  {
    id: 'empty_document',
    name: 'Documento Vacío',
    description: 'Plantilla en blanco lista para escribir código desde cero.',
    code: `import cadquery as cq

# Escribe tu script de CadQuery aquí
# Ejemplo:
# pieza = cq.Workplane("XY").box(100, 50, 30)

`
  }
];

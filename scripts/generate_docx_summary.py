"""
===============================================================================
GENERADOR MAESTRO DEL DOCUMENTO WORD: GUÍA DE SUSTENTACIÓN ORAL
===============================================================================
Genera el documento oficial editable para la sustentación:
'Guia_Estudio_Sustentacion_Oral_Arquitectura.docx'
con formato corporativo de alta calidad, diagramas C4 y UML integrados,
tablas estilizadas, callouts ejecutivos, encabezados, pies de página y
todo el contenido pedagógico y técnico exigido para la evaluación docente.
===============================================================================
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIAGRAMS_DIR = os.path.join(BASE_DIR, 'docs', 'diagrams')
OUTPUT_DOCX = os.path.join(BASE_DIR, 'docs', 'Guia_Estudio_Sustentacion_Oral_Arquitectura.docx')

# ─────────────────────────────────────────────────────────────────────────────
# PALETA INSTITUCIONAL EJECUTIVA
# ─────────────────────────────────────────────────────────────────────────────
COLOR_NAVY      = RGBColor(0, 51, 102)     # #003366 - Institucional GOV.CO
COLOR_PRIMARY   = RGBColor(30, 58, 138)    # #1E3A8A - Azul Corporativo
COLOR_SECONDARY = RGBColor(14, 116, 144)   # #0E7490 - Cian Técnico
COLOR_DARK      = RGBColor(30, 41, 59)     # #1E293B - Slate Texto Principal
COLOR_MUTED     = RGBColor(100, 116, 139)  # #64748B - Slate Secundario
COLOR_ALERT_RED = RGBColor(185, 28, 28)    # #B91C1C - Peligro / Ataque
COLOR_ALERT_GRN = RGBColor(21, 128, 61)    # #15803D - Éxito / Defensa
COLOR_GOLD      = RGBColor(180, 83, 9)     # #B45309 - Amber / Importante

HEX_NAVY        = "003366"
HEX_PRIMARY     = "1E3A8A"
HEX_SECONDARY   = "0E7490"
HEX_BG_LIGHT    = "F8FAFC"
HEX_BG_ALT      = "F1F5F9"
HEX_BORDER      = "CBD5E1"
HEX_RED_BG      = "FEF2F2"
HEX_GREEN_BG    = "F0FDF4"
HEX_AMBER_BG    = "FFFBEB"

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS XML PARA TABLAS Y ESTILOS AVANZADOS EN PYTHON-DOCX
# ─────────────────────────────────────────────────────────────────────────────

def set_cell_background(cell, fill_hex):
    """Aplica sombreado de color de fondo a una celda de tabla."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
    """Define márgenes internos (padding dxa) en una celda."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_cell_borders(cell, top=None, bottom=None, left=None, right=None):
    """Configura bordes específicos para una celda."""
    tcPr = cell._tc.get_or_add_tcPr()
    borders_xml = f'<w:tcBorders {nsdecls("w")}>\n'
    edges = {'top': top, 'bottom': bottom, 'left': left, 'right': right}
    for edge_name, edge_opts in edges.items():
        if edge_opts:
            val = edge_opts.get('val', 'single')
            sz = edge_opts.get('sz', 4)
            color = edge_opts.get('color', HEX_BORDER)
            borders_xml += f'  <w:{edge_name} w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
        else:
            borders_xml += f'  <w:{edge_name} w:val="none"/>\n'
    borders_xml += '</w:tcBorders>'
    tcPr.append(parse_xml(borders_xml))

def add_page_number_field(run):
    """Inserta el campo nativo de número de página de Word (PAGE)."""
    fld1 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="begin"/>')
    instr = parse_xml(f'<w:instrText {nsdecls("w")} xml:space="preserve"> PAGE </w:instrText>')
    fld2 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="separate"/>')
    fld3 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="end"/>')
    run._r.append(fld1)
    run._r.append(instr)
    run._r.append(fld2)
    run._r.append(fld3)

def add_numpages_field(run):
    """Inserta el campo nativo de total de páginas de Word (NUMPAGES)."""
    fld1 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="begin"/>')
    instr = parse_xml(f'<w:instrText {nsdecls("w")} xml:space="preserve"> NUMPAGES </w:instrText>')
    fld2 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="separate"/>')
    fld3 = parse_xml(f'<w:fldChar {nsdecls("w")} w:fldCharType="end"/>')
    run._r.append(fld1)
    run._r.append(instr)
    run._r.append(fld2)
    run._r.append(fld3)

# ─────────────────────────────────────────────────────────────────────────────
# GENERADOR PRINCIPAL DEL DOCUMENTO
# ─────────────────────────────────────────────────────────────────────────────

def create_document():
    print(f"[DOCX] Iniciando compilación de Guía Maestra de Sustentación Oral...")
    doc = docx.Document()

    # 1. Configuración de Página y Márgenes
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)

        # Encabezado Formal
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("ALCALDÍA MUNICIPAL · Sustentación de Arquitectura de Software (Caso 2)")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = COLOR_MUTED

        # Pie de Página Formal con "Página X de Y"
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        frun1 = fp.add_run("Documento de Estudio y Defensa Oral — arc42 + C4 Model + ADRs + Walking Skeleton   |   ")
        frun1.font.name = "Calibri"
        frun1.font.size = Pt(8.5)
        frun1.font.color.rgb = COLOR_MUTED
        
        frun2 = fp.add_run("Página ")
        frun2.font.name = "Calibri"
        frun2.font.size = Pt(8.5)
        frun2.font.color.rgb = COLOR_MUTED
        add_page_number_field(frun2)
        
        frun3 = fp.add_run(" de ")
        frun3.font.name = "Calibri"
        frun3.font.size = Pt(8.5)
        frun3.font.color.rgb = COLOR_MUTED
        add_numpages_field(frun3)

    # ─────────────────────────────────────────────────────────────────────────
    # HELPERS DE CONTENIDO Y TIPOGRAFÍA
    # ─────────────────────────────────────────────────────────────────────────

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(15.5)
        run.font.bold = True
        run.font.color.rgb = COLOR_PRIMARY
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(13)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(12.5)
        run.font.bold = True
        run.font.color.rgb = COLOR_SECONDARY
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(9)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(11)
        run.font.bold = True
        run.font.color.rgb = COLOR_DARK
        return p

    def add_callout(title, text, callout_type="primary"):
        """Inserta una tarjeta destacada con borde lateral grueso y fondo tintado."""
        colors_map = {
            "primary": (HEX_PRIMARY, HEX_BG_LIGHT, COLOR_PRIMARY),
            "secondary": (HEX_SECONDARY, HEX_BG_ALT, COLOR_SECONDARY),
            "danger": ("B91C1C", HEX_RED_BG, COLOR_ALERT_RED),
            "success": ("15803D", HEX_GREEN_BG, COLOR_ALERT_GRN),
            "warning": ("B45309", HEX_AMBER_BG, COLOR_GOLD),
        }
        border_hex, bg_hex, title_color = colors_map.get(callout_type, (HEX_PRIMARY, HEX_BG_LIGHT, COLOR_PRIMARY))

        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        c = tbl.rows[0].cells[0]
        c.width = Inches(6.8)

        set_cell_background(c, bg_hex)
        set_cell_margins(c, top=100, bottom=100, left=180, right=160)
        set_cell_borders(c, 
                         left={'val': 'single', 'sz': 24, 'color': border_hex},
                         top={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                         bottom={'val': 'single', 'sz': 4, 'color': 'E2E8F0'},
                         right={'val': 'single', 'sz': 4, 'color': 'E2E8F0'})

        p = c.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        rt = p.add_run(title + "\n")
        rt.bold = True
        rt.font.name = "Calibri"
        rt.font.size = Pt(10.5)
        rt.font.color.rgb = title_color

        rb = p.add_run(text)
        rb.font.name = "Calibri"
        rb.font.size = Pt(9.5)
        rb.font.color.rgb = COLOR_DARK

        doc.add_paragraph().paragraph_format.space_after = Pt(2)

    def add_bullet(p, bold_prefix, text):
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.left_indent = Inches(0.2)
        run_b = p.add_run("• " + bold_prefix)
        run_b.bold = True
        run_b.font.name = "Calibri"
        run_b.font.color.rgb = COLOR_DARK
        run_t = p.add_run(text)
        run_t.font.name = "Calibri"
        run_t.font.color.rgb = COLOR_DARK

    def add_diagram_image(filename, caption_text, width_inches=6.0):
        img_path = os.path.join(DIAGRAMS_DIR, filename)
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(8)
            p_img.paragraph_format.space_after = Pt(2)
            doc.add_picture(img_path, width=Inches(width_inches))

            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_after = Pt(10)
            r_cap = p_cap.add_run(caption_text)
            r_cap.font.name = "Calibri"
            r_cap.font.size = Pt(9)
            r_cap.font.italic = True
            r_cap.font.color.rgb = COLOR_MUTED
        else:
            print(f"[WARN] Imagen no encontrada: {img_path}")

    # ─────────────────────────────────────────────────────────────────────────
    # ENCABEZADO Y METADATOS PRINCIPALES (PORTADA EJECUTIVA)
    # ─────────────────────────────────────────────────────────────────────────

    # Banner Institucional Superior
    p_gov = doc.add_paragraph()
    p_gov.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_gov.paragraph_format.space_after = Pt(2)
    r_gov = p_gov.add_run("REPÚBLICA DE COLOMBIA · ALCALDÍA MUNICIPAL · SECRETARÍA DE GOBIERNO")
    r_gov.font.name = "Calibri"
    r_gov.font.size = Pt(9.5)
    r_gov.font.bold = True
    r_gov.font.color.rgb = COLOR_MUTED

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run("GUÍA MAESTRA DE SUSTENTACIÓN ORAL")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(24)
    run_title.font.bold = True
    run_title.font.color.rgb = COLOR_NAVY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(14)
    run_sub = p_sub.add_run("Defensa Técnica Integral: arc42 + C4 Model + ADR Battle + Despliegue Físico + Walking Skeleton HU-01")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(12)
    run_sub.font.bold = True
    run_sub.font.color.rgb = COLOR_SECONDARY

    # Tarjeta de Ficha Técnica
    tbl_meta = doc.add_table(rows=4, cols=2)
    tbl_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_meta.autofit = False

    meta_items = [
        ("Proyecto Evaluado:", "Sistema de Gestión y Emisión Digital de Trámites y Certificados 24/7 (Caso 2: Alcaldía Municipal)"),
        ("Materia y Enfoque:", "Arquitectura de Software / Ingeniería de Software (arc42, C4, ADRs, ISO/IEC 25010)"),
        ("Dinámica de Evaluación:", "Sustentación Oral Grupal: ADR Battle (Defensa vs Ataque) + Del Diagrama a la Tabla + Demo en Vivo"),
        ("Estado de Entrega:", "Versión 2.0 Oficial — 100% de Pruebas Automatizadas Pasando (8/8) — Listo para Exposición")
    ]
    for row_idx, (k, v) in enumerate(meta_items):
        c0, c1 = tbl_meta.rows[row_idx].cells[0], tbl_meta.rows[row_idx].cells[1]
        c0.width, c1.width = Inches(2.2), Inches(4.6)
        bg = HEX_BG_ALT if row_idx % 2 == 0 else "FFFFFF"
        for c in (c0, c1):
            set_cell_background(c, bg)
            set_cell_margins(c, top=70, bottom=70, left=120, right=120)
            set_cell_borders(c, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        
        p0 = c0.paragraphs[0]
        r0 = p0.add_run(k)
        r0.bold = True
        r0.font.name = "Calibri"
        r0.font.size = Pt(9.5)
        r0.font.color.rgb = COLOR_PRIMARY

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(v)
        r1.font.name = "Calibri"
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = COLOR_DARK

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 1: EL PROBLEMA Y LA SOLUCIÓN (CONTEXTO EN 60 SEGUNDOS)
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("1. El Problema y la Solución (Contexto en 60 Segundos)")

    add_callout(
        "📌 ELEVATOR PITCH PARA ABRIR LA SUSTENTACIÓN",
        "«Profesora, la Alcaldía Municipal operaba con una aplicación de escritorio heredada del año 2009 en un único computador físico bajo el escritorio del secretario de despacho. El sistema sufría congelamientos continuos, no tenía respaldo, dependía de un único funcionario para reiniciarse y obligaba a los ciudadanos a hacer filas presenciales desde las 5:00 a.m. Nuestra solución moderniza la entidad mediante el patrón Strangler Fig en N-Capas, permitiendo radicación y consulta web 24/7 con código QR, autenticación JWT sin estado, base relacional PostgreSQL 16 y trazabilidad inmutable ante la Personería Municipal.»",
        "primary"
    )

    p = doc.add_paragraph()
    add_bullet(p, "Diagnóstico del Sistema Legado (2009): ", 
               "Arquitectura cliente-servidor obsoleta, acoplada al hardware local, sin logs de auditoría, con una ventana de atención restringida a 4 horas matutinas (~200 trámites/semana) y quejas formales ante la Personería.")

    p = doc.add_paragraph()
    add_bullet(p, "Decisión de Modernización (Patrón Strangler Fig): ", 
               "En lugar de un 'Big Bang' riesgoso que paralizara la alcaldía, se despliega una fachada web y API REST que intercepta las solicitudes nuevas ciudadanas, conviviendo temporalmente con el sistema viejo hasta su apagado definitivo en Fase 3.")

    p = doc.add_paragraph()
    add_bullet(p, "Corte Vertical Demostrable (Walking Skeleton HU-01): ", 
               "Radicación completa en línea del Certificado de Residencia atravesando TODAS las capas reales: Vista Web Responsive → Rutas Express → Auth Middleware JWT → Controlador de Negocio → Modelos ORM Sequelize → Base de Datos PostgreSQL 16.")

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 2: MODELO C4 Y ESTÁNDAR ARC42
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("2. Modelo C4 y Estándar arc42 (Vistas de Arquitectura)")

    p_c4_intro = doc.add_paragraph()
    p_c4_intro.add_run(
        "El estándar arc42 simplificado y el Modelo C4 permiten comunicar la arquitectura con diferente nivel de abstracción, "
        "desde el contexto institucional con usuarios externos hasta los contenedores y componentes ejecutables."
    )

    add_h2("2.1 Diagrama de Contexto del Sistema (C4 Nivel 1)")
    add_diagram_image("c4_nivel1_contexto.png", "Figura 1: Diagrama de Contexto del Sistema (C4 Nivel 1)")

    # Tabla de Elementos C4 Nivel 1
    t_c4_1 = doc.add_table(rows=5, cols=3)
    t_c4_1.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_c4_1.autofit = False

    headers_c4_1 = [("Elemento / Actor", 1.8), ("Tipo", 1.2), ("Responsabilidad en el Sistema", 3.8)]
    for i, (h, w) in enumerate(headers_c4_1):
        c = t_c4_1.rows[0].cells[i]
        c.width = Inches(w)
        set_cell_background(c, HEX_PRIMARY)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.bold = True
        r.font.name = "Calibri"
        r.font.color.rgb = RGBColor(255, 255, 255)

    data_c4_1 = [
        ("Ciudadano", "Persona Externa", "Radica solicitudes 24/7 y consulta el estado de sus certificados mediante código de radicado."),
        ("Funcionario", "Persona Interna", "Revisa, aprueba o rechaza solicitudes y emite certificados oficiales desde la Secretaría de Gobierno."),
        ("Sistema de Trámites", "Sistema Software", "Plataforma central web en N-Capas que procesa trámites, emite certificados con QR y audita."),
        ("Sistema Legado (2009)", "Sistema Externo", "Software de escritorio histórico que se moderniza gradualmente mediante el patrón Strangler Fig.")
    ]
    for r_idx, (col1, col2, col3) in enumerate(data_c4_1, start=1):
        c1, c2, c3 = t_c4_1.rows[r_idx].cells[0], t_c4_1.rows[r_idx].cells[1], t_c4_1.rows[r_idx].cells[2]
        c1.width, c2.width, c3.width = Inches(1.8), Inches(1.2), Inches(3.8)
        bg = "FFFFFF" if r_idx % 2 == 1 else HEX_BG_LIGHT
        for c in (c1, c2, c3):
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=100, right=100)
            set_cell_borders(c, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        p1 = c1.paragraphs[0]; r1 = p1.add_run(col1); r1.bold = True
        c2.paragraphs[0].add_run(col2)
        c3.paragraphs[0].add_run(col3)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    add_h2("2.2 Diagrama de Contenedores y Capas (C4 Nivel 2)")
    add_diagram_image("c4_nivel2_contenedores.png", "Figura 2: Diagrama de Contenedores y Capas (C4 Nivel 2)")

    # Tabla de Elementos C4 Nivel 2
    t_c4_2 = doc.add_table(rows=4, cols=4)
    t_c4_2.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_c4_2.autofit = False

    headers_c4_2 = [("Contenedor", 1.6), ("Tecnología", 1.6), ("Protocolo", 1.2), ("Función Principal", 2.4)]
    for i, (h, w) in enumerate(headers_c4_2):
        c = t_c4_2.rows[0].cells[i]
        c.width = Inches(w)
        set_cell_background(c, HEX_SECONDARY)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.bold = True
        r.font.name = "Calibri"
        r.font.color.rgb = RGBColor(255, 255, 255)

    data_c4_2 = [
        ("Portal Web", "HTML5 + JS + Bootstrap Icons", "HTTPS / WSS", "Interfaz responsiva para radicación, consulta QR y panel de funcionarios."),
        ("API REST Backend", "Node.js 20 + Express + Sequelize", "HTTP REST / JSON", "Aplica reglas de negocio, valida JWT, audita y emite eventos en tiempo real."),
        ("Base de Datos", "PostgreSQL 16 Relacional", "TCP / SQL (Port 5432)", "Persistencia con transacciones ACID, integridad referencial y borrado lógico.")
    ]
    for r_idx, (col1, col2, col3, col4) in enumerate(data_c4_2, start=1):
        cells = t_c4_2.rows[r_idx].cells
        for i, w in enumerate([1.6, 1.6, 1.2, 2.4]):
            cells[i].width = Inches(w)
            bg = "FFFFFF" if r_idx % 2 == 1 else HEX_BG_LIGHT
            set_cell_background(cells[i], bg)
            set_cell_margins(cells[i], top=60, bottom=60, left=100, right=100)
            set_cell_borders(cells[i], bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        p0 = cells[0].paragraphs[0]; r0 = p0.add_run(col1); r0.bold = True
        cells[1].paragraphs[0].add_run(col2)
        cells[2].paragraphs[0].add_run(col3)
        cells[3].paragraphs[0].add_run(col4)

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 3: ATRIBUTOS DE CALIDAD (ISO/IEC 25010) Y RESTRICCIONES
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("3. Atributos de Calidad (ISO/IEC 25010) y Restricciones")

    p_ac_desc = doc.add_paragraph()
    p_ac_desc.add_run(
        "Toda decisión de arquitectura se fundamenta en métricas cuantitativas verificables. "
        "En la sustentación, cada argumento debe ligarse directamente a uno de estos atributos:"
    )

    t_ac = doc.add_table(rows=5, cols=4)
    t_ac.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_ac.autofit = False

    h_ac = [("ID y Atributo", 1.5), ("Escenario de Calidad", 2.2), ("Métrica Medible", 1.6), ("Forma de Verificación", 1.5)]
    for i, (h, w) in enumerate(h_ac):
        c = t_ac.rows[0].cells[i]
        c.width = Inches(w)
        set_cell_background(c, HEX_PRIMARY)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.bold = True
        r.font.name = "Calibri"
        r.font.color.rgb = RGBColor(255, 255, 255)

    data_ac = [
        ("AC-01\nSeguridad", "Petición no autorizada a /api/solicitudes sin token JWT válido.", "100% de rechazos con HTTP 401; bcrypt >= 10 rounds.", "Prueba automatizada Test 1 y colección Postman."),
        ("AC-02\nDesempeño", "50 solicitudes concurrentes de radicación o consulta en el servidor.", "P95 <= 800 ms; 0% de errores 500 no controlados.", "Pruebas de carga con Autocannon / JMeter."),
        ("AC-03\nMantenibilidad", "Modificar una regla o agregar un campo al formulario municipal.", "Cambio en <= 3 archivos sin tocar capas ajenas.", "Revisión de N-Capas (Modelo, Migración, Controlador)."),
        ("AC-04\nConfiabilidad", "Excepción no controlada o caída de proceso en el backend.", "Reinicio automático en < 10s (restart: unless-stopped).", "Simulación kill de contenedor y respuesta /api/health.")
    ]
    for r_idx, (col1, col2, col3, col4) in enumerate(data_ac, start=1):
        cells = t_ac.rows[r_idx].cells
        for i, w in enumerate([1.5, 2.2, 1.6, 1.5]):
            cells[i].width = Inches(w)
            bg = "FFFFFF" if r_idx % 2 == 1 else HEX_BG_LIGHT
            set_cell_background(cells[i], bg)
            set_cell_margins(cells[i], top=60, bottom=60, left=100, right=100)
            set_cell_borders(cells[i], bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        p0 = cells[0].paragraphs[0]; r0 = p0.add_run(col1); r0.bold = True
        cells[1].paragraphs[0].add_run(col2)
        cells[2].paragraphs[0].add_run(col3)
        cells[3].paragraphs[0].add_run(col4)

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 4: DIAGRAMA UML DE DESPLIEGUE (DISTRIBUCIÓN FÍSICA)
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("4. Diagrama UML de Despliegue (Distribución Física del Sistema)")

    p_dep = doc.add_paragraph()
    p_dep.add_run(
        "El Diagrama de Despliegue modela la arquitectura de infraestructura física y virtualizada, "
        "mostrando cómo los artefactos ejecutables se alojan en nodos computacionales, sus puertos de escucha y volúmenes de almacenamiento:"
    )

    add_diagram_image("uml_despliegue.png", "Figura 3: Diagrama UML de Despliegue e Infraestructura Contenedorizada")

    t_dep = doc.add_table(rows=6, cols=3)
    t_dep.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_dep.autofit = False

    h_dep = [("Elemento UML", 1.8), ("Identificador / Recurso", 2.2), ("Detalle Técnico y Función", 2.8)]
    for i, (h, w) in enumerate(h_dep):
        c = t_dep.rows[0].cells[i]
        c.width = Inches(w)
        set_cell_background(c, HEX_PRIMARY)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.bold = True
        r.font.name = "Calibri"
        r.font.color.rgb = RGBColor(255, 255, 255)

    dep_data = [
        ("Nodo Físico / VM", "Servidor Docker Host", "Servidor físico o máquina virtual con Docker Engine donde corren los contenedores aislados."),
        ("Artefacto Backend", "Contenedor app-backend", "Empaqueta la API REST Node.js 20 con Express. Expone el PUERTO 3000 (HTTP/WS) para peticiones ciudadanas."),
        ("Artefacto Base Datos", "Contenedor db", "Empaqueta la base de datos oficial postgres:16-alpine. Expone el PUERTO 5432 (TCP/SQL) para transacciones ACID."),
        ("Artefacto Almacenamiento", "Volumen pgdata", "Mapeo persistente (pgdata:/var/lib/postgresql/data) que asegura que los trámites no se pierdan al reiniciar contenedores."),
        ("Red Virtual", "Bridge red-alcaldia", "Red interna Docker que aísla la comunicación entre backend y base de datos, impidiendo accesos externos no autorizados a PostgreSQL.")
    ]
    for row_idx, (col1, col2, col3) in enumerate(dep_data, start=1):
        c1, c2, c3 = t_dep.rows[row_idx].cells[0], t_dep.rows[row_idx].cells[1], t_dep.rows[row_idx].cells[2]
        c1.width, c2.width, c3.width = Inches(1.8), Inches(2.2), Inches(2.8)
        bg = "FFFFFF" if row_idx % 2 == 1 else HEX_BG_LIGHT
        for c in (c1, c2, c3):
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=100, right=100)
            set_cell_borders(c, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        p1 = c1.paragraphs[0]; r1 = p1.add_run(col1); r1.bold = True
        c2.paragraphs[0].add_run(col2)
        c3.paragraphs[0].add_run(col3)

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 5: ADRs Y DINÁMICA "ADR BATTLE DEL ESCENARIO"
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("5. Registros de Decisiones (ADRs) y Dinámica 'ADR Battle'")

    add_callout(
        "⚔️ REGLAS DE ORO DE LA DINÁMICA 'ADR BATTLE' (2.ª Ronda Grupal)",
        "En la dinámica exigida por la docente, un integrante del grupo defiende la decisión ligándola a un Atributo de Calidad (AC) positivo, mientras que otro integrante asume el rol de contraparte argumentando el trade-off negativo y cómo mitigar la deuda técnica. ¡No memorizar discursos planos, dominar los dos lados de la moneda!",
        "warning"
    )

    # ADR-001
    add_h2("Caso 1: ADR-001 · N-Capas con Estrategia Strangler Fig (Modernización Progresiva)")
    t_adr1 = doc.add_table(rows=3, cols=2)
    t_adr1.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_adr1.autofit = False

    h_cards = [("Postura", 1.8), ("Argumentación Técnica y Trade-offs", 5.0)]
    for i, (h, w) in enumerate(h_cards):
        c = t_adr1.rows[0].cells[i]
        c.width = Inches(w)
        set_cell_background(c, HEX_PRIMARY)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h); r.bold = True; r.font.color.rgb = RGBColor(255, 255, 255)

    data_adr1 = [
        ("A FAVOR\n(Defensa)",
         "• Mantenibilidad (AC-03): Separa nítidamente interfaz, reglas y base de datos; modificar una capa no rompe las otras.\n"
         "• Viabilidad Pública (RA-01): Permite contratar por etapas (Fase 1: Ventanilla web ciudadana; Fase 2: Emisión QR; Fase 3: Desmantelamiento legado).\n"
         "• Confiabilidad (AC-04): Desacopla la radicación web del PC físico del despacho; la web recibe trámites 24/7 aunque el PC viejo falle."),
        ("EN CONTRA\n(Ataque / Trade-off)",
         "• Duplicidad temporal: Coexisten dos interfaces (portal web para ciudadanos y binario de 2009 para funcionarios).\n"
         "• Riesgo de concurrencia: Ambos sistemas acceden a la base de datos común, exigiendo sincronización meticulosa.\n"
         "• MITIGACIÓN: Es deuda técnica temporal controlada con vistas de base de datos; en la Fase 3 se retira el software viejo al 100%.")
    ]
    for row_idx, (col1, col2) in enumerate(data_adr1, start=1):
        c1, c2 = t_adr1.rows[row_idx].cells[0], t_adr1.rows[row_idx].cells[1]
        c1.width, c2.width = Inches(1.8), Inches(5.0)
        bg = HEX_BG_LIGHT if row_idx == 1 else HEX_RED_BG
        set_cell_background(c1, bg); set_cell_background(c2, bg)
        set_cell_margins(c1, top=80, bottom=80, left=100, right=100)
        set_cell_margins(c2, top=80, bottom=80, left=100, right=100)
        set_cell_borders(c1, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        set_cell_borders(c2, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        p1 = c1.paragraphs[0]; r1 = p1.add_run(col1); r1.bold = True
        r1.font.color.rgb = COLOR_PRIMARY if "FAVOR" in col1 else COLOR_ALERT_RED
        c2.paragraphs[0].add_run(col2)

    # ADR-002
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    add_h2("Caso 2: ADR-002 · Autenticación JWT sin Estado (Stateless) vs Sesiones en Servidor")
    t_adr2 = doc.add_table(rows=3, cols=2)
    t_adr2.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_adr2.autofit = False
    for i, (h, w) in enumerate(h_cards):
        c = t_adr2.rows[0].cells[i]; c.width = Inches(w)
        set_cell_background(c, HEX_SECONDARY)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h); r.bold = True; r.font.color.rgb = RGBColor(255, 255, 255)

    data_adr2 = [
        ("A FAVOR\n(Defensa)",
         "• Escalabilidad y Portabilidad (AC-02): El servidor no guarda estado en memoria (stateless); levantar más réplicas en contenedores Docker no desloguea a los usuarios.\n"
         "• Criptografía y Seguridad (AC-01): Tokens firmados con HMAC SHA-256 inalterables y contraseñas hasheadas con bcrypt (factor >= 10).\n"
         "• Eficiencia Operativa: No obliga a pagar ni administrar un cluster de Redis para una alcaldía con 200 trámites semanales."),
        ("EN CONTRA\n(Ataque / Trade-off)",
         "• Revocación imposible de inmediato: Una vez emitido el token, no se puede invalidar fácilmente antes de que expire.\n"
         "• Mayor payload: El token en el header Authorization es más pesado que una simple cookie de sesión.\n"
         "• MITIGACIÓN: Vigencia corta de 8 horas y verificación obligatoria del atributo activo=true en la base de datos en peticiones sensibles.")
    ]
    for row_idx, (col1, col2) in enumerate(data_adr2, start=1):
        c1, c2 = t_adr2.rows[row_idx].cells[0], t_adr2.rows[row_idx].cells[1]
        c1.width, c2.width = Inches(1.8), Inches(5.0)
        bg = HEX_BG_LIGHT if row_idx == 1 else HEX_RED_BG
        set_cell_background(c1, bg); set_cell_background(c2, bg)
        set_cell_margins(c1, top=80, bottom=80, left=100, right=100)
        set_cell_margins(c2, top=80, bottom=80, left=100, right=100)
        set_cell_borders(c1, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        set_cell_borders(c2, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        p1 = c1.paragraphs[0]; r1 = p1.add_run(col1); r1.bold = True
        r1.font.color.rgb = COLOR_SECONDARY if "FAVOR" in col1 else COLOR_ALERT_RED
        c2.paragraphs[0].add_run(col2)

    # ADR-003
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    add_h2("Caso 3: ADR-003 · PostgreSQL 16 + ORM Sequelize vs SQL Nativo / NoSQL")
    t_adr3 = doc.add_table(rows=3, cols=2)
    t_adr3.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_adr3.autofit = False
    for i, (h, w) in enumerate(h_cards):
        c = t_adr3.rows[0].cells[i]; c.width = Inches(w)
        set_cell_background(c, HEX_PRIMARY)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h); r.bold = True; r.font.color.rgb = RGBColor(255, 255, 255)

    data_adr3 = [
        ("A FAVOR\n(Defensa)",
         "• Integridad de Datos (AC-01): Garantiza transacciones ACID, restricciones UNIQUE y llaves foráneas requeridas por la fe pública municipal (descartando NoSQL).\n"
         "• Seguridad contra Inyecciones SQL (AC-01): El ORM parametriza y sanitiza automáticamente todas las consultas.\n"
         "• Mantenibilidad (AC-03): Modelos y migraciones versionadas en código; un contratista nuevo entiende la base de datos sin descifrar scripts en crudo."),
        ("EN CONTRA\n(Ataque / Trade-off)",
         "• Sobrecarga de rendimiento: Un ORM añade latencia y capas de abstracción frente a consultas SQL crudas altamente optimizadas.\n"
         "• Riesgo de problema N+1 queries: Si no se configuran bien las relaciones, puede disparar múltiples consultas innecesarias.\n"
         "• MITIGACIÓN: Uso explícito de eager loading (include con JOINs) y un pool de 10 conexiones; se permite SQL nativo (sequelize.query) para reportes masivos.")
    ]
    for row_idx, (col1, col2) in enumerate(data_adr3, start=1):
        c1, c2 = t_adr3.rows[row_idx].cells[0], t_adr3.rows[row_idx].cells[1]
        c1.width, c2.width = Inches(1.8), Inches(5.0)
        bg = HEX_BG_LIGHT if row_idx == 1 else HEX_RED_BG
        set_cell_background(c1, bg); set_cell_background(c2, bg)
        set_cell_margins(c1, top=80, bottom=80, left=100, right=100)
        set_cell_margins(c2, top=80, bottom=80, left=100, right=100)
        set_cell_borders(c1, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        set_cell_borders(c2, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})
        p1 = c1.paragraphs[0]; r1 = p1.add_run(col1); r1.bold = True
        r1.font.color.rgb = COLOR_PRIMARY if "FAVOR" in col1 else COLOR_ALERT_RED
        c2.paragraphs[0].add_run(col2)

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 6: SUSTENTACIÓN ESPECIAL CLASE 4 ("DEL DIAGRAMA A LA TABLA")
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("6. Sustentación Especial Clase 4 («Del Diagrama a la Tabla»)")

    add_callout(
        "🎯 PROPÓSITO DE LA CLASE 4",
        "Demostrar ante la docente la correspondencia exacta 1:1 entre los diagramas UML (Clases y Secuencia) y las tablas físicas en PostgreSQL 16, sometiendo la base de datos a pruebas de fuego: INSERTs dictados, INSERTs venenosos que deben reventar por restricciones, consultas relámpago con agregaciones temporales y un cambio sorpresa de diseño.",
        "primary"
    )

    add_h2("6.1 Paso 1: Los INSERT Dictados (Flujo Feliz)")
    p = doc.add_paragraph()
    add_bullet(p, "1a. Inserción de Ciudadano: ", "Carlos Urrego (CC 1020304050). Se inserta con hash bcrypt seguro, NUNCA texto plano (AC-01 Seguridad).")
    p = doc.add_paragraph()
    add_bullet(p, "1b. Inserción de Solicitud: ", "Radicado RAD-2026-00001 para Certificado de Residencia en predio 'Calle 10 # 5-23', barrio 'Centro'.")
    p = doc.add_paragraph()
    add_bullet(p, "1c. Expedición de Certificado: ", "Certificado CERT-2026-00001 ligado a la solicitud aprobada, con código QR oficial, hash SHA-256 inmutable y vigencia calculada a 90 días (CURRENT_DATE + 90).")

    add_h2("6.2 Paso 2: Los INSERT Venenosos (Validación de Restricciones)")
    p_ven = doc.add_paragraph()
    p_ven.add_run("La docente evalúa que la base de datos proteja la integridad de la fe pública rechazando datos ilegales:")

    p = doc.add_paragraph()
    add_bullet(p, "Veneno A: Segundo Certificado para la MISMA Solicitud → DEBE FALLAR: ", 
               "Al intentar insertar un segundo certificado referenciando la solicitud RAD-2026-00001, PostgreSQL arroja de inmediato:\n"
               "«ERROR: duplicate key value violates unique constraint 'uq_certificado_solicitud'».\n"
               "Justificación: Una solicitud produce como máximo un certificado (1..0..1 en el diagrama de clases).")

    p = doc.add_paragraph()
    add_bullet(p, "Veneno B: Solicitud con Estado 'perdida' → DEBE FALLAR: ", 
               "Al intentar registrar un estado no reconocido, PostgreSQL arroja:\n"
               "«ERROR: new row violates check constraint 'solicitudes_tramite_estado_check'».\n"
               "Justificación: La máquina de estados oficial solo admite ('radicada', 'en_revision', 'aprobada', 'rechazada', 'cancelada').")

    add_h2("6.3 Paso 3: Consulta Relámpago (Agregación Temporal)")
    p_rel = doc.add_paragraph()
    p_rel.add_run(
        "Consulta para responder en < 30 segundos cuántos trámites activos se han radicado esta semana, agrupados por estado:\n"
        "SELECT estado, COUNT(*) AS total FROM solicitudes_tramite WHERE activo AND created_at >= date_trunc('week', CURRENT_DATE) GROUP BY estado;"
    )

    add_h2("6.4 Paso 4: Cambio Sorpresa de la Personería Municipal")
    add_callout(
        "⚖️ EL CAMBIO SORPRESA DE LA DOCENTE",
        "«La Personería Municipal exige saber con nombre propio qué funcionario expidió cada certificado para determinar responsabilidades disciplinarias. ¿Cómo lo modela?». R/: NUNCA como un campo de texto libre 'funcionario_nombre' (mala práctica que destruye la integridad referencial). Se crea la entidad formal 'funcionarios' (id, usuario_id FK UNIQUE hacia usuarios, codigo_funcionario UK, cargo, dependencia) y se agrega la FK 'funcionario_id REFERENCES funcionarios(id)' en la tabla 'certificados'.",
        "success"
    )

    add_h2("6.5 Diagramas de Soporte Clase 4")
    add_diagram_image("uml_clases_dominio.png", "Figura 4: Diagrama de Clases del Dominio — Ciudadano · Solicitud · Certificado")
    add_diagram_image("uml_secuencia_hu01.png", "Figura 5: Diagrama de Secuencia — Radicación y Expedición (HU-01 / HU-02)")

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 7: CORTE VERTICAL (WALKING SKELETON HU-01) EN EJECUCIÓN
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("7. Corte Vertical (Walking Skeleton HU-01) en Ejecución")

    p_cv = doc.add_paragraph()
    p_cv.add_run(
        "¿Qué es un Corte Vertical? Es una implementación mínima de extremo a extremo que atraviesa TODAS las capas reales "
        "de la arquitectura (Interfaz Web, Transporte REST, Middlewares de Seguridad, Lógica de Negocio, ORM y Persistencia Física), "
        "a diferencia de un corte horizontal que se queda solo en maquetar pantallas o crear scripts SQL sin integración."
    )

    cv_layers = [
        ("Capa 1: Presentación / Vista (public/index.html y app.js):", 
         "Interfaz web ciudadana responsiva. Envía POST a /api/solicitudes con payload JSON y la cabecera 'Authorization: Bearer <token>'."),
        
        ("Capa 2: Rutas y Middlewares de Seguridad (src/routes/ y src/middlewares/):", 
         "solicitud.routes.js intercepta la petición y auth.middleware.js valida la firma del JWT. Si no hay token o expiró, responde 401 Unauthorized sin tocar el controlador."),
        
        ("Capa 3: Lógica de Negocio y Controladores (src/controllers/solicitud.controller.js):", 
         "Valida datos requeridos, previene duplicidad activa para el mismo predio (409 Conflict), genera radicado único RAD-2026-XXXXX, hash SHA-256 y emite eventos WebSocket."),
        
        ("Capa 4: Acceso a Datos y Mapeo ORM (src/models/ y src/config/database.js):", 
         "Modelos Sequelize que tipan la entidad, aplican transacciones atómicas (BEGIN ... COMMIT) y generan queries SQL parametrizados inmunes a SQL Injection."),
        
        ("Capa 5: Persistencia Relacional Física (PostgreSQL 16 en Docker):", 
         "Tabla solicitudes_tramite y auditoria_tramites donde se graba físicamente la fila con PK, FK usuario_id, restricciones UNIQUE y activo=true para borrado lógico.")
    ]
    for c_title, c_desc in cv_layers:
        p = doc.add_paragraph()
        add_bullet(p, c_title + " ", c_desc)

    add_h2("Demostración en Vivo en 3 Minutos (Postman / Terminal)")
    demo_steps = [
        ("1. Servidor y Base de Datos Levantados:", "Ejecutar 'npm start' o 'docker-compose up'. La consola muestra: Servidor en puerto 3000 y conexión PostgreSQL establecida."),
        ("2. Pruebas Automatizadas Pasando (npm test):", "Al correr 'npm test', se ejecutan 8 pruebas de integración automáticas en Jest/Supertest que validan los 8 escenarios arquitectónicos críticos. Todas pasan 100% en verde."),
        ("3. Flujo en Postman (3 Peticiones):", 
         "• Petición 1: POST /api/auth/login para obtener el token JWT.\n"
         "• Petición 2: POST /api/solicitudes con token Bearer; el servidor responde 201 Created con el nuevo radicado oficial.\n"
         "• Petición 3: GET /api/solicitudes/seguimiento/:radicado; el servidor responde 200 OK trayendo los datos desde PostgreSQL.")
    ]
    for d_title, d_desc in demo_steps:
        p = doc.add_paragraph()
        add_bullet(p, d_title + " ", d_desc)

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 8: TABLA MAESTRA DE CÓDIGOS DE RESPUESTA HTTP
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("8. Tabla Maestra de Códigos de Respuesta HTTP")

    t_http = doc.add_table(rows=10, cols=3)
    t_http.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_http.autofit = False

    h_http = [("Código HTTP", 1.5), ("Significado Estándar", 2.2), ("Caso Exacto en Nuestro Sistema", 3.1)]
    for i, (h, w) in enumerate(h_http):
        c = t_http.rows[0].cells[i]
        c.width = Inches(w)
        set_cell_background(c, HEX_PRIMARY)
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h); r.bold = True; r.font.color.rgb = RGBColor(255, 255, 255)

    http_data = [
        ("200 OK", "Petición exitosa con datos", "Consultar estado de trámite por radicado (GET /api/solicitudes/seguimiento/:radicado)."),
        ("201 Created", "Recurso creado satisfactoriamente", "Radicación exitosa de un certificado (POST /api/solicitudes)."),
        ("204 No Content", "Operación exitosa sin cuerpo", "Cancelación por borrado lógico (DELETE /api/solicitudes/:id)."),
        ("400 Bad Request", "Petición malformada o incompleta", "Formulario con campos vacíos o tipos de datos erróneos."),
        ("401 Unauthorized", "Autenticación requerida o token inválido", "Intento de radicar sin haber iniciado sesión o con token manipulado."),
        ("403 Forbidden", "Permisos insuficientes", "Ciudadano intentando cancelar un trámite ajeno o acceder a rutas de funcionarios."),
        ("404 Not Found", "Recurso no encontrado", "Búsqueda de un número de radicado inexistente."),
        ("409 Conflict", "Conflicto con el estado actual", "Intento de solicitar un certificado duplicado ya activo para el mismo predio."),
        ("500 Server Error", "Error interno no controlado", "Caída de conexión con la base de datos o fallo no capturado.")
    ]
    for row_idx, (col1, col2, col3) in enumerate(http_data, start=1):
        c1, c2, c3 = t_http.rows[row_idx].cells[0], t_http.rows[row_idx].cells[1], t_http.rows[row_idx].cells[2]
        c1.width, c2.width, c3.width = Inches(1.5), Inches(2.2), Inches(3.1)
        bg = "FFFFFF" if row_idx % 2 == 1 else HEX_BG_LIGHT
        for c in (c1, c2, c3):
            set_cell_background(c, bg)
            set_cell_margins(c, top=60, bottom=60, left=100, right=100)
            set_cell_borders(c, bottom={'val': 'single', 'sz': 4, 'color': HEX_BORDER})

        p1 = c1.paragraphs[0]; r1 = p1.add_run(col1); r1.bold = True
        r1.font.color.rgb = COLOR_ALERT_GRN if col1.startswith("2") else COLOR_ALERT_RED
        c2.paragraphs[0].add_run(col2)
        c3.paragraphs[0].add_run(col3)

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 9: BANCO DE RESPUESTAS A PREGUNTAS DEL POOL DE LA DOCENTE
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("9. Banco de Respuestas a Preguntas del Pool de la Docente")

    qa_list = [
        ("¿Por qué descartaron una arquitectura de Microservicios?",
         "Porque los microservicios introducen una sobrecarga operativa masiva (latencia de red, orquestación, consistencia eventual y monitoreo distribuido) injustificada para una alcaldía municipal con ~200 trámites semanales y un único técnico de soporte (RA-03). N-Capas ofrece el desacople ideal con mínima fricción operativa."),

        ("¿Por qué N-Capas mejora la Mantenibilidad (AC-03)?",
         "Porque cumple el Principio de Responsabilidad Única (SRP). Si mañana rediseñamos la interfaz web o cambiamos el motor de base de datos a Oracle, la lógica de negocio en los controladores permanece 100% intacta."),

        ("¿Qué es y para qué sirve el patrón Singleton en este proyecto?",
         "Garantiza que exista una única instancia de un recurso compartido en memoria. En nuestro sistema se aplica en 'src/config/database.js' para mantener un único pool de 10 conexiones hacia PostgreSQL en lugar de abrir una conexión costosa por cada petición HTTP."),

        ("¿Cuál es la diferencia entre autenticación y autorización?",
         "Autenticación verifica QUIÉN es el usuario (mediante cédula/clave y firma criptográfica de JWT). Autorización verifica QUÉ TIENE PERMITIDO HACER según su rol (RBAC: ciudadano radica y consulta; funcionario aprueba y emite)."),

        ("¿Por qué usan borrado lógico en lugar de DELETE físico?",
         "Porque la Ley de Archivo General de la Nación y la Personería Municipal prohíben destruir registros de fe pública. El borrado lógico marca 'activo = false' y conserva la trazabilidad completa en la bitácora inmutable de auditoría."),

        ("¿Cómo garantizan que un token JWT no sea falsificado?",
         "Porque está firmado digitalmente con el algoritmo HMAC SHA-256 utilizando una clave secreta (JWT_SECRET) que solo el servidor conoce. Si un atacante altera el payload, la firma se invalida y el middleware rechaza con 401.")
    ]
    for q, a in qa_list:
        add_h2("❓ " + q)
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        r_ans = p.add_run("R/: ")
        r_ans.bold = True
        r_ans.font.color.rgb = COLOR_SECONDARY
        p.add_run(a)

    # ─────────────────────────────────────────────────────────────────────────
    # SECCIÓN 10: ESTRATEGIA Y HOJA DE RUTA PARA CALIFICACIÓN MÁXIMA
    # ─────────────────────────────────────────────────────────────────────────
    add_h1("10. Estrategia y Hoja de Ruta de Exposición (Minuto a Minuto)")

    add_callout(
        "⏱️ DISTRIBUCIÓN RECOMENDADA DE TIEMPOS (Total: 12-15 Minutos)",
        "• Minutos 0 a 2: El Problema Real (PC bajo el escritorio en 2009) y Visión General de la Solución.\n"
        "• Minutos 2 a 5: Modelo C4 (Contexto y Contenedores) + Diagrama de Despliegue Físico (Docker, Puertos, Redes).\n"
        "• Minutos 5 a 8: ADR Battle del Escenario (ADR-001, ADR-002, ADR-003) con posturas cruzadas y trade-offs.\n"
        "• Minutos 8 a 11: Sustentación Clase 4 (INSERTs dictados, INSERTs venenosos y cambio sorpresa de la Personería).\n"
        "• Minutos 11 a 14: Demostración en vivo del Corte Vertical (WebSockets en vivo, Postman y npm test 8/8).\n"
        "• Minuto 15: Conclusiones y cierre contundente.",
        "success"
    )

    # Guardar documento
    doc.save(OUTPUT_DOCX)
    print(f"[DOCX] Guía de Sustentación generada exitosamente en: {OUTPUT_DOCX}")

if __name__ == "__main__":
    create_document()

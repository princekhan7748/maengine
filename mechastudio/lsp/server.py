"""
MechaStudio Language Server Protocol (LSP) Server
Powered by pygls to provide live validation, documentation hovers,
and autocomplete for CalculiX .inp files and MechaStudio simulation schemas.
"""

from typing import List, Optional
from pygls.server import LanguageServer
from lsprotocol.types import (
    TEXT_DOCUMENT_HOVER,
    TEXT_DOCUMENT_COMPLETION,
    Hover,
    HoverParams,
    CompletionList,
    CompletionItem,
    CompletionItemKind,
    CompletionParams,
    MarkupContent,
    MarkupKind,
)

server = LanguageServer("mechastudio-lsp", "v0.1.0")

# Keyword documentation knowledge-base for CalculiX / Abaqus syntax
CALCULIX_KEYWORD_DOCS = {
    "*HEADING": "Defines a descriptive title for the analysis model.",
    "*MATERIAL": "Begins a material definition block.\n\n**Parameters:**\n- `NAME`: Unique identifier for the material.",
    "*ELASTIC": "Specifies isotropic linear elastic properties.\n\n**Data Line:**\n`Young's Modulus (E), Poisson's Ratio (nu)`",
    "*DENSITY": "Specifies mass density.\n\n**Data Line:**\n`Density (rho)`",
    "*PLASTIC": "Specifies rate-independent elastoplasticity.\n\n**Data Line:**\n`Yield Stress, Plastic Strain`",
    "*SOLID SECTION": "Assigns material properties to an element set.\n\n**Parameters:**\n- `ELSET`: Target element set name.\n- `MATERIAL`: Associated material name.",
    "*STEP": "Marks the beginning of an analysis step.\n\n**Parameters:**\n- `NLGEOM`: Enables finite deformation / geometric nonlinearity.",
    "*STATIC": "Specifies static equilibrium analysis.\n\n**Data Line:**\n`Initial time increment, Total step time`",
    "*FREQUENCY": "Extracts natural frequencies and mode shapes via Lanczos eigensolver.\n\n**Data Line:**\n`Number of modes to extract`",
    "*BOUNDARY": "Applies kinematic constraints (displacements/rotations).\n\n**Data Line:**\n`Node_or_Set, First_DOF, Last_DOF, Prescribed_Displacement`",
    "*DLOAD": "Applies distributed loads (pressure or body gravity).\n\n**Data Line:**\n`Element_or_Set, Load_Type (P/GRAV), Magnitude, Vector_Components`",
    "*CLOAD": "Applies concentrated nodal forces.\n\n**Data Line:**\n`Node_or_Set, DOF_Direction (1, 2, or 3), Force_Magnitude`",
    "*CONTACT PAIR": "Defines face-to-face or penalty contact between master and slave surface sets.",
    "*NODE FILE": "Requests nodal output written to the .frd result file (`U`, `RF`).",
    "*EL FILE": "Requests element output written to the .frd result file (`S`, `E`, `PEEQ`).",
    "*END STEP": "Concludes the current analysis step.",
}


@server.feature(TEXT_DOCUMENT_HOVER)
def on_hover(ls: LanguageServer, params: HoverParams) -> Optional[Hover]:
    """Provides contextual documentation when hovering over CAE keywords."""
    doc = ls.workspace.get_text_document(params.text_document.uri)
    lines = doc.source.splitlines()
    if params.position.line < len(lines):
        line = lines[params.position.line].strip()
        for kw, doc_text in CALCULIX_KEYWORD_DOCS.items():
            if line.upper().startswith(kw):
                return Hover(
                    contents=MarkupContent(
                        kind=MarkupKind.Markdown,
                        value=f"### {kw} (CalculiX / Abaqus)\n\n{doc_text}"
                    )
                )
    return None


@server.feature(TEXT_DOCUMENT_COMPLETION)
def on_completion(ls: LanguageServer, params: CompletionParams) -> CompletionList:
    """Provides autocomplete suggestions for CAE keywords."""
    items = []
    for kw, doc_text in CALCULIX_KEYWORD_DOCS.items():
        items.append(
            CompletionItem(
                label=kw,
                kind=CompletionItemKind.Keyword,
                documentation=doc_text,
                insert_text=kw,
            )
        )
    return CompletionList(is_incomplete=False, items=items)


if __name__ == "__main__":
    server.start_io()


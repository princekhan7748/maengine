"""
MechaStudio Language Server Protocol (LSP) Server
Powered by pygls to provide live validation, syntax diagnostics,
documentation hovers, and autocomplete for CalculiX .inp files.
"""

from typing import List, Optional
try:
    from pygls.lsp.server import LanguageServer
except ImportError:
    from pygls.server import LanguageServer
from lsprotocol.types import (
    TEXT_DOCUMENT_HOVER,
    TEXT_DOCUMENT_COMPLETION,
    TEXT_DOCUMENT_DID_OPEN,
    TEXT_DOCUMENT_DID_CHANGE,
    TEXT_DOCUMENT_DID_SAVE,
    Hover,
    HoverParams,
    CompletionList,
    CompletionItem,
    CompletionItemKind,
    CompletionParams,
    MarkupContent,
    MarkupKind,
    DidOpenTextDocumentParams,
    DidChangeTextDocumentParams,
    DidSaveTextDocumentParams,
    Diagnostic,
    DiagnosticSeverity,
    Range,
    Position,
)

server = LanguageServer("mechastudio-lsp", "v0.1.0")

# Expanded keyword documentation knowledge-base for CalculiX / Abaqus syntax
CALCULIX_KEYWORD_DOCS = {
    "*HEADING": "Defines a descriptive title for the analysis model. Note: CalculiX permits strictly one `*HEADING` card per deck.",
    "*INCLUDE": "Includes an external input file, typically an element mesh (`*INCLUDE, INPUT=mesh.inp`).",
    "*MATERIAL": "Begins a material definition block.\n\n**Parameters:**\n- `NAME`: Unique identifier for the material.",
    "*ELASTIC": "Specifies isotropic linear elastic properties.\n\n**Data Line:**\n`Young's Modulus (E), Poisson's Ratio (nu)`",
    "*DENSITY": "Specifies mass density.\n\n**Data Line:**\n`Density (rho, e.g. tonne/mm^3 or kg/m^3)`",
    "*PLASTIC": "Specifies rate-independent elastoplasticity.\n\n**Data Line:**\n`Yield Stress, Plastic Strain`",
    "*CONDUCTIVITY": "Specifies isotropic or orthotropic thermal conductivity for heat transfer analyses.\n\n**Data Line:**\n`Conductivity (k), Temperature`",
    "*SPECIFIC HEAT": "Specifies specific heat capacity for transient thermal analyses.\n\n**Data Line:**\n`Specific Heat (Cp), Temperature`",
    "*EXPANSION": "Defines thermal expansion coefficient for coupled thermo-mechanical expansion.",
    "*SOLID SECTION": "Assigns material properties to an element set.\n\n**Parameters:**\n- `ELSET`: Target element set name.\n- `MATERIAL`: Associated material name.",
    "*STEP": "Marks the beginning of an analysis step.\n\n**Parameters:**\n- `NLGEOM`: Enables finite deformation / geometric nonlinearity.",
    "*STATIC": "Specifies static equilibrium analysis.\n\n**Data Line:**\n`Initial time increment, Total step time, Minimum increment, Maximum increment`",
    "*FREQUENCY": "Extracts natural frequencies and mode shapes via Lanczos eigensolver.\n\n**Data Line:**\n`Number of modes to extract`",
    "*HEAT TRANSFER": "Begins a thermal conduction heat transfer analysis.\n\n**Parameters:**\n- `STEADY STATE`: For steady thermal equilibrium.",
    "*STEADY STATE DYNAMICS": "Calculates harmonic frequency response under cyclic loading.\n\n**Data Line:**\n`Lower frequency, Upper frequency, Number of steps, Bias`",
    "*COUPLED TEMPERATURE-DISPLACEMENT": "Coupled thermo-mechanical analysis computing temperature and displacement fields simultaneously.",
    "*BOUNDARY": "Applies kinematic constraints (displacements/rotations or temperatures at DOF 11).\n\n**Data Line:**\n`Node_or_Set, First_DOF, Last_DOF, Value`",
    "*DLOAD": "Applies distributed loads (pressure `P` or gravity acceleration `GRAV`).\n\n**Data Line:**\n`Element_or_Set, Load_Type, Magnitude, Vector_Components`",
    "*CLOAD": "Applies concentrated nodal forces.\n\n**Data Line:**\n`Node_or_Set, DOF_Direction (1, 2, or 3), Force_Magnitude`",
    "*DFLUX": "Applies distributed surface or body heat flux in thermal analyses.\n\n**Data Line:**\n`Element_or_Set, Flux_Type (S/B), Magnitude`",
    "*CFLUX": "Applies concentrated heat flux at nodal points (DOF 11).\n\n**Data Line:**\n`Node_or_Set, 11, Heat_Flux_Rate`",
    "*CONTACT PAIR": "Defines face-to-face or penalty contact between master and slave surface sets.",
    "*SURFACE INTERACTION": "Specifies mechanical interaction properties for contact pairs.",
    "*SURFACE BEHAVIOR": "Defines contact pressure-overclosure relationship (LINEAR, EXPONENTIAL, HARD).",
    "*TIE": "Binds two surfaces together permanently (bonded contact / MPC glue).",
    "*NODE FILE": "Requests nodal output written to the binary `.frd` result file (`U`, `RF`, `NT`).",
    "*EL FILE": "Requests integration point element output written to the `.frd` result file (`S`, `E`, `HFL`).",
    "*NODE PRINT": "Requests tabular nodal output in the `.dat` ASCII report.",
    "*EL PRINT": "Requests tabular element output in the `.dat` ASCII report.",
    "*END STEP": "Concludes the current analysis step.",
}


def validate_deck(source: str) -> List[Diagnostic]:
    """
    Performs static analysis on CalculiX input decks to catch common solver fatal errors.
    """
    diagnostics: List[Diagnostic] = []
    lines = source.splitlines()

    heading_count = 0
    step_stack: List[int] = []

    for i, raw_line in enumerate(lines):
        line = raw_line.strip()
        upper = line.upper()

        # Check duplicate *HEADING
        if upper.startswith("*HEADING"):
            heading_count += 1
            if heading_count > 1:
                diagnostics.append(
                    Diagnostic(
                        range=Range(
                            start=Position(line=i, character=0),
                            end=Position(line=i, character=len(raw_line))
                        ),
                        message="CalculiX Fatal Error: More than 1 *HEADING card in deck. Additional headings cause immediate solver crash.",
                        severity=DiagnosticSeverity.Error,
                        source="MechaStudio Linter"
                    )
                )

        # Track *STEP and *END STEP
        if upper.startswith("*STEP"):
            step_stack.append(i)
        elif upper.startswith("*END STEP"):
            if not step_stack:
                diagnostics.append(
                    Diagnostic(
                        range=Range(
                            start=Position(line=i, character=0),
                            end=Position(line=i, character=len(raw_line))
                        ),
                        message="Syntax Warning: *END STEP without preceding *STEP.",
                        severity=DiagnosticSeverity.Warning,
                        source="MechaStudio Linter"
                    )
                )
            else:
                step_stack.pop()

        # Check *MATERIAL has NAME
        if upper.startswith("*MATERIAL") and "NAME=" not in upper:
            diagnostics.append(
                Diagnostic(
                    range=Range(
                        start=Position(line=i, character=0),
                        end=Position(line=i, character=len(raw_line))
                    ),
                    message="Missing required parameter: *MATERIAL must specify NAME (e.g. *MATERIAL, NAME=STEEL).",
                    severity=DiagnosticSeverity.Error,
                    source="MechaStudio Linter"
                )
            )

        # Check *SOLID SECTION has ELSET and MATERIAL
        if upper.startswith("*SOLID SECTION"):
            if "ELSET=" not in upper or "MATERIAL=" not in upper:
                diagnostics.append(
                    Diagnostic(
                        range=Range(
                            start=Position(line=i, character=0),
                            end=Position(line=i, character=len(raw_line))
                        ),
                        message="Missing required parameters: *SOLID SECTION requires both ELSET and MATERIAL (e.g. *SOLID SECTION, ELSET=EALL, MATERIAL=STEEL).",
                        severity=DiagnosticSeverity.Error,
                        source="MechaStudio Linter"
                    )
                )

    # Check unclosed *STEP blocks
    for step_line in step_stack:
        diagnostics.append(
            Diagnostic(
                range=Range(
                    start=Position(line=step_line, character=0),
                    end=Position(line=step_line, character=len(lines[step_line]))
                ),
                message="Unclosed analysis step: *STEP has no matching *END STEP.",
                severity=DiagnosticSeverity.Error,
                source="MechaStudio Linter"
            )
        )

    return diagnostics


@server.feature(TEXT_DOCUMENT_DID_OPEN)
def did_open(ls: LanguageServer, params: DidOpenTextDocumentParams):
    doc = ls.workspace.get_text_document(params.text_document.uri)
    diagnostics = validate_deck(doc.source)
    ls.publish_diagnostics(doc.uri, diagnostics)


@server.feature(TEXT_DOCUMENT_DID_CHANGE)
def did_change(ls: LanguageServer, params: DidChangeTextDocumentParams):
    doc = ls.workspace.get_text_document(params.text_document.uri)
    diagnostics = validate_deck(doc.source)
    ls.publish_diagnostics(doc.uri, diagnostics)


@server.feature(TEXT_DOCUMENT_DID_SAVE)
def did_save(ls: LanguageServer, params: DidSaveTextDocumentParams):
    doc = ls.workspace.get_text_document(params.text_document.uri)
    diagnostics = validate_deck(doc.source)
    ls.publish_diagnostics(doc.uri, diagnostics)


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
                        value=f"### {kw} (CalculiX / Abaqus Syntax)\n\n{doc_text}"
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

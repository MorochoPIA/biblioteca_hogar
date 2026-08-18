#!/bin/bash
# Pipeline de OCR para Biblioteca Digital
# Procesa todos los PDFs escaneados y les inyecta capa de texto buscable
# Requisitos: tesseract-ocr, tesseract-ocr-spa, ocrmypdf
#
# Instalacion:
#   sudo apt install tesseract-ocr tesseract-ocr-spa
#   pip install ocrmypdf

INPUT_DIR="./storage/pdfs_raw"
OUTPUT_DIR="./storage/pdfs"
LANG="spa"

mkdir -p "$INPUT_DIR" "$OUTPUT_DIR"

echo "=== Pipeline OCR - Biblioteca Digital ==="
echo "Procesando PDFs desde: $INPUT_DIR"
echo ""

for pdf in "$INPUT_DIR"/*.pdf; do
    [ -f "$pdf" ] || continue
    filename=$(basename "$pdf")
    output="$OUTPUT_DIR/$filename"
    echo "Procesando: $filename"
    ocrmypdf --language "$LANG" --optimize 2 --output-type pdf "$pdf" "$output"
    if [ $? -eq 0 ]; then
        echo "  OK -> $output"
        mv "$pdf" "$INPUT_DIR/.done/"
    else
        echo "  ERROR al procesar $filename"
    fi
    echo ""
done

echo "Pipeline completado."

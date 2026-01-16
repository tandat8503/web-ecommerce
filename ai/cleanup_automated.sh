#!/bin/bash
# Automated Cleanup Script for AI Folder
# Only keep: Product Chatbot + Legal Chatbot

set -e  # Exit on error

echo "============================================================"
echo "🧹 AI FOLDER CLEANUP SCRIPT"
echo "============================================================"
echo ""
echo "Chức năng giữ lại:"
echo "  ✅ Product Chatbot"
echo "  ✅ Legal Chatbot"
echo ""
echo "Sẽ xóa:"
echo "  ❌ Analytics services"
echo "  ❌ Report services"
echo "  ❌ Sentiment services"
echo "  ❌ Unused agents"
echo "  ❌ Old backup files"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AI_DIR="$SCRIPT_DIR"

echo "📁 Working directory: $AI_DIR"
echo ""

# Ask for confirmation
read -p "⚠️  Bạn có chắc muốn tiếp tục? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Đã hủy cleanup"
    exit 1
fi

echo ""
echo "============================================================"
echo "📦 STEP 1: BACKUP"
echo "============================================================"

# Create backup
BACKUP_DIR="$AI_DIR/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating backup at: $BACKUP_DIR"

# Backup files sắp xóa
if [ -d "$AI_DIR/services/analyst" ]; then
    cp -r "$AI_DIR/services/analyst" "$BACKUP_DIR/" 2>/dev/null || true
fi

if [ -d "$AI_DIR/services/report" ]; then
    cp -r "$AI_DIR/services/report" "$BACKUP_DIR/" 2>/dev/null || true
fi

if [ -d "$AI_DIR/services/sentiment" ]; then
    cp -r "$AI_DIR/services/sentiment" "$BACKUP_DIR/" 2>/dev/null || true
fi

echo "✅ Backup complete"
echo ""

echo "============================================================"
echo "🗑️  STEP 2: DELETE UNUSED SERVICES"
echo "============================================================"

# Delete services
if [ -d "$AI_DIR/services/analyst" ]; then
    echo "Deleting: services/analyst/"
    rm -rf "$AI_DIR/services/analyst"
    echo "  ✅ Deleted analyst service"
fi

if [ -d "$AI_DIR/services/report" ]; then
    echo "Deleting: services/report/"
    rm -rf "$AI_DIR/services/report"
    echo "  ✅ Deleted report service"
fi

if [ -d "$AI_DIR/services/sentiment" ]; then
    echo "Deleting: services/sentiment/"
    rm -rf "$AI_DIR/services/sentiment"
    echo "  ✅ Deleted sentiment service"
fi

echo ""

echo "============================================================"
echo "🗑️  STEP 3: DELETE UNUSED AGENTS"
echo "============================================================"

cd "$AI_DIR/agents" 2>/dev/null || true

if [ -f "business_analyst.py" ]; then
    echo "Deleting: agents/business_analyst.py"
    rm -f business_analyst.py
    echo "  ✅ Deleted"
fi

if [ -f "report_generator.py" ]; then
    echo "Deleting: agents/report_generator.py"
    rm -f report_generator.py
    echo "  ✅ Deleted"
fi

if [ -f "sentiment_analyzer.py" ]; then
    echo "Deleting: agents/sentiment_analyzer.py"
    rm -f sentiment_analyzer.py
    echo "  ✅ Deleted"
fi

if [ -f "content_moderation.py" ]; then
    echo "Deleting: agents/content_moderation.py"
    rm -f content_moderation.py
    echo "  ✅ Deleted"
fi

cd "$AI_DIR"
echo ""

echo "============================================================"
echo "🗑️  STEP 4: DELETE OLD SCRIPTS"
echo "============================================================"

cd "$AI_DIR/scripts" 2>/dev/null || true

# Delete old analysis files
for file in WHY_40_PERCENT_ACCURACY.md LAW_COVERAGE_ANALYSIS.md HANDLING_SCANNED_FILES.md; do
    if [ -f "$file" ]; then
        echo "Deleting: scripts/$file"
        rm -f "$file"
        echo "  ✅ Deleted"
    fi
done

cd "$AI_DIR"
echo ""

echo "============================================================"
echo "🗑️  STEP 5: DELETE BACKUP FILES"
echo "============================================================"

if [ -f "app_simplified.py" ]; then
    echo "Deleting: app_simplified.py"
    rm -f app_simplified.py
    echo "  ✅ Deleted"
fi

if [ -f "README_FOR_INSTRUCTOR.md" ]; then
    echo "Deleting: README_FOR_INSTRUCTOR.md"
    rm -f README_FOR_INSTRUCTOR.md
    echo "  ✅ Deleted"
fi

if [ -f "SUMMARY.md" ]; then
    echo "Deleting: SUMMARY.md"
    rm -f SUMMARY.md
    echo "  ✅ Deleted"
fi

echo ""

echo "============================================================"
echo "📊 CLEANUP SUMMARY"
echo "============================================================"

echo ""
echo "✅ Deleted:"
echo "   - services/analyst/"
echo "   - services/report/"
echo "   - services/sentiment/"
echo "   - agents/business_analyst.py"
echo "   - agents/report_generator.py"
echo "   - agents/sentiment_analyzer.py"
echo "   - agents/content_moderation.py"
echo "   - Old scripts and docs"
echo "   - Backup files"
echo ""

echo "✅ Kept:"
echo "   - app.py (main server)"
echo "   - core/ (config, db, logging)"
echo "   - services/chatbot/ (Product chatbot)"
echo "   - services/legal/ (Legal chatbot)"
echo "   - shared/llm_client.py"
echo "   - chroma_db/ (VectorDB data)"
echo "   - scripts/ (seeding, embedding)"
echo ""

echo "📦 Backup location:"
echo "   $BACKUP_DIR"
echo ""

echo "============================================================"
echo "🎉 CLEANUP COMPLETE!"
echo "============================================================"
echo ""

echo "Next steps:"
echo "  1. Test server: python app.py"
echo "  2. Test endpoints:"
echo "     - curl http://localhost:8000/health"
echo "     - curl -X POST http://localhost:8000/chat ..."
echo "  3. If OK, delete backup: rm -rf $BACKUP_DIR"
echo ""

echo "✅ Done!"

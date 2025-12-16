#!/bin/bash
# Comprehensive demo: All features in sequence

echo "=== CLI TODO Manager - Full Feature Demo ==="
echo ""

echo "1. Adding three TODOs..."
echo "2. Viewing list..."
echo "3. Exporting to binary file..."
echo "4. Viewing exported file size..."
echo "5. Searching for keyword..."
echo "6. Importing from binary..."
echo "7. Final list view..."
echo ""

echo -e "1\nBuyMilk\nOrganic\n1\nWriteDocs\nBPLGuide\n1\nFixBug\nIssue127\n2\n3\n3\ntodos_demo.bin\n2\n5\nMilk\n3\n4\ntodos_demo.bin\ny\n2\n3\n5" | ./main

echo ""
echo "=== Demo Complete ==="
ls -lh todos_demo.bin 2>/dev/null && echo "Binary file created successfully!" || echo "Binary export issue"

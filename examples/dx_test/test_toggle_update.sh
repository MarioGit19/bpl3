#!/bin/bash
# Test toggle completed and update operations using getRef()

set -e
cd "$(dirname "$0")"

echo "=== Testing Toggle Completed & Update (using getRef) ==="
echo ""
echo "1. Add a TODO"
echo "2. View it (completed=No)"
echo "3. Toggle completed"
echo "4. View it again (completed=Yes)"
echo "5. Update it with new values"
echo "6. View final state"
echo ""

../../cmp.sh main.bpl <<EOF
1
TestTask
TestDescription
2
3
0
2
4
1
2
3
0
2
1
1
UpdatedTask
UpdatedDescription
1
2
3
0
5
EOF

echo ""
echo "=== Test Complete ==="

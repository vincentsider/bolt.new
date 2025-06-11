#!/bin/bash

# Test component library API endpoint
echo "🧪 Testing Component Library API"
echo "================================"

# Check which port the server is running on
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    PORT="5173"
elif curl -s http://localhost:5174 > /dev/null 2>&1; then
    PORT="5174"
else
    echo "❌ No server running on port 5173 or 5174. Please start the dev server with 'pnpm run dev'"
    exit 1
fi

echo "✅ Using port: $PORT"

# Your organization ID
ORG_ID="6d508492-0e67-4d5a-aa81-ddbe83eee4db"

# Test the component library API
echo -e "\n📊 Testing /api/component-library endpoint..."
curl -X GET "http://localhost:${PORT}/api/component-library?organization_id=$ORG_ID" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n\n📈 Testing /api/component-library/stats endpoint..."
curl -X GET "http://localhost:${PORT}/api/component-library/stats?organization_id=$ORG_ID" \
  -H "Content-Type: application/json" \
  | jq '.'

echo -e "\n\n🧪 Testing /api/test-component-library endpoint..."
curl -X POST "http://localhost:${PORT}/api/test-component-library" \
  -H "Content-Type: application/json" \
  -d "{\"organizationId\": \"$ORG_ID\", \"description\": \"I need an expense reimbursement workflow\"}" \
  | jq '.'

echo -e "\n\n✅ API tests complete"
.PHONY: setup check dev test typecheck

setup:
	@node -e "const major=Number(process.versions.node.split('.')[0]); if (major<22) { console.error('Node.js 22 or newer is required. Current: '+process.version); process.exit(1); }"
	npm ci

check: typecheck test

typecheck:
	npm run typecheck

test:
	npm test

dev:
	@node -e "const major=Number(process.versions.node.split('.')[0]); if (major<22) { console.error('Node.js 22 or newer is required. Current: '+process.version); process.exit(1); }"
	@test -d node_modules || npm ci
	npm run dev

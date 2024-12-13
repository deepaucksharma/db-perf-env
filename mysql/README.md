## Deployment Options

### Docker-based MySQL (Default)
```bash
./scripts/run.sh docker
```

### Local MySQL Setup
1. Install MySQL locally
2. Run setup script:
```bash
./scripts/setup-local.sh
# Edit .env.local with your credentials
```

3. Start services:
```bash
./scripts/run.sh local
```

### Configuration Files
- `.env.docker`: Docker MySQL configuration
- `.env.local`: Local MySQL settings (created from template)
- `.env.local.template`: Template for local setup

### Switching Environments
- To use Docker MySQL: `./scripts/run.sh docker`
- To use local MySQL: `./scripts/run.sh local`

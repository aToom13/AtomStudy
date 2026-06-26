# Contributing to AtomStudy

First off, thank you for considering contributing!

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
 - A clear title and description
 - Steps to reproduce
 - Expected vs actual behavior
 - Screenshots if applicable

### Suggesting Features

1. Open a new issue with the label `enhancement`
2. Describe the feature and why it would be useful
3. If possible, include examples of how it would work

### Pull Requests

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Run any existing tests
5. Commit with a clear message
6. Push and open a Pull Request

## Development Setup

1. Clone the repo
2. Copy `backend/.env.example` to `backend/.dev.vars` and fill in the values
3. Follow the setup instructions in the [README](README.md)

## Style Guides

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters

### Code Style

- **JavaScript/Node.js:** Standard JS conventions
- **Dart/Flutter:** Follow `analysis_options.yaml` rules
- **Documentation:** Keep it concise and in Turkish/English as appropriate

## Security

- Never commit API keys, tokens, or passwords
- Use `.dev.vars` for local development secrets
- Use `wrangler secret put` for production secrets
- If you find a security vulnerability, please open an issue

## Questions?

Open an issue or reach out to the maintainers.

Thank you for contributing!

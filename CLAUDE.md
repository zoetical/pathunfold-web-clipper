# PathUnfold Web Clipper - CLAUDE.md

## Project Overview
PathUnfold Web Clipper is a browser extension designed to help users capture, organize, and save web content. The extension will allow users to clip articles, screenshots, or selected content from web pages and save them to their PathUnfold account for later reference.

## Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Build Tool**: Webpack or Vite for bundling
- **Testing**: Jest for unit tests, Playwright for E2E tests
- **Linting**: ESLint with Prettier
- **Type Checking**: TypeScript (optional but recommended)

## Development Commands
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Type check (if using TypeScript)
npm run type-check
```

## Architecture Guidelines

### Extension Structure
```
src/
├── background/       # Background scripts
├── content/         # Content scripts
├── popup/          # Popup UI
├── options/        # Options page
├── lib/            # Shared utilities
└── assets/         # Static assets
```

### Key Components
1. **Background Script**: Manages extension lifecycle, storage, and API communication
2. **Content Script**: Handles web page interaction and content extraction
3. **Popup UI**: User interface for quick clipping actions
4. **Options Page**: Settings and configuration management

### Data Flow
1. User triggers clipper via toolbar icon or keyboard shortcut
2. Content script captures selected content or full page
3. Data is processed and formatted
4. Processed data is sent to background script
5. Background script saves to PathUnfold API or local storage

## Feature Guidelines
- Support multiple clip types: article, selection, screenshot, full page
- Implement tagging and categorization system
- Add offline support with sync capability
- Ensure privacy and security of clipped content
- Provide export functionality (PDF, Markdown, etc.)

## Browser Compatibility
- Chrome (primary target)
- Firefox
- Safari
- Edge (Chromium-based)

## Security Considerations
- All API communication must use HTTPS
- User authentication tokens should be stored securely
- Content scripts should have minimal permissions
- Regular security audits of dependencies

## Code Style
- Follow modern JavaScript best practices
- Use semantic HTML5 elements
- Implement responsive design for popup and options pages
- Write clear, documented code with JSDoc comments
- Maintain browser compatibility through feature detection

## Performance
- Minimize content script impact on host pages
- Use lazy loading for non-critical features
- Optimize bundle size for faster loading
- Implement efficient data storage and retrieval
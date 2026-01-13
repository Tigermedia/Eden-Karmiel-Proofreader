import { PDFProofreader } from './components/proofreader';

const APP_VERSION = '1.0.0';

function App() {
  return (
    <div className="app">
      <header className="app-header" style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute',
          left: '1rem',
          top: '1rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
        }}>
          v{APP_VERSION}
        </span>
        <h1>בודק הגהה למצבות</h1>
        <p>העלו קובץ לבדיקת שגיאות כתיב, דקדוק ותאריכים</p>
      </header>

      <main className="app-main">
        <PDFProofreader />
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '1rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
      }}>
        עדן כרמיאל - מצבות
      </footer>
    </div>
  );
}

export default App;

import { PDFProofreader } from './components/proofreader';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>בודק הגהה למצבות</h1>
        <p>העלו קובץ PDF לבדיקת שגיאות כתיב, דקדוק ותאריכים</p>
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

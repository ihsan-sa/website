import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <p>
          Hello, I'm <span style={{ color: '#c792ea' }}>Ihsan</span>.
        </p>
        <p style={{fontSize: '17px'}}>
          Website under construction.
          Shoot me a message at <a href="mailto:hi@ihsan.cc" style={{color: '#d06085', textDecoration: 'none' }}>hi@ihsan.cc</a>
        </p>
        <p style={{fontSize: '17px'}}>
          Check out my projects: <a href="https://docs.ihsan.cc" style={{color: '#d06085', textDecoration: 'none' }}>docs.ihsan.cc</a>
        </p>
      </header>
    </div>
  );
}

export default App;

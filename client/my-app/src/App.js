import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function App() {
  const code = new URLSearchParams(window.location.search).get('code');
  //console.log(code);
  return (
    <div> 
        {code ? <Dashboard code={code}/> : <Login /> }
    </div>
  );
}

export default App;

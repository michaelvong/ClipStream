import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function App() {
  let code = null;
  if(localStorage.getItem("access_token") !== 'undefined'){
    console.log('token exists')
    code = true;
  } else {
    code = new URLSearchParams(window.location.search).get('code');
  }
  
  //console.log(code);
  return (
    <div> 
        {code ? <Dashboard code={code}/> : <Login /> }
    </div>
  );
}

export default App;

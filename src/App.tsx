import {lazy,Suspense} from 'react'
import {BrowserRouter,Route,Routes,Navigate} from 'react-router'
import {readEnvironment} from './config/environment'
import {Icon} from './components/Icon'
import {PwaUpdate} from './components/PwaUpdate'

const environment=readEnvironment(import.meta.env)
const ConnectedApp=lazy(()=>import('./auth/ConnectedApp'))
function SetupScreen() {
  return <div className="setup-screen"><div className="setup-brand"><Icon name="route-linear" size={30}/>GaadiHisaab</div><span className="setup-business">Icchamani Construction</span><h1>A clear place for<br/>a busy business.</h1><p>The app foundation is ready to connect. Add the public project settings to your local environment when Clerk and Supabase are set up.</p><div className="setup-card"><h2>Connect your workspace</h2><p>Copy <code>.env.example</code> to <code>.env.local</code>, add the three public settings, then restart the development server.</p><div className="setup-checks">{environment.issues.map(issue=><div key={issue}><Icon name="info-circle-linear" size={18}/><span>{issue}</span></div>)}</div><small>Secret keys stay on the server. No sample records are loaded into the real app.</small></div><p className="setup-footnote">You can set up those services later. The database and local sync checks run independently.</p></div>
}
export default function App() {
  return <BrowserRouter><PwaUpdate/><Routes>
    <Route path="/*" element={environment.config?<Suspense fallback={<div className="connection-screen" role="status">Opening your workspace…</div>}><ConnectedApp config={environment.config}/></Suspense>:<SetupScreen/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></BrowserRouter>
}

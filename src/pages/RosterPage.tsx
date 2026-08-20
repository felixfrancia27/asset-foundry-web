import { RosterCatalog } from '../components/Roster'

export default function RosterPage() {
  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">The lunar-RTS roster</h1>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 15 }}>
          Every unit, building, prop and munition the game needs. Pick one and forge it.
        </p>
      </div>
      <RosterCatalog />
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Button, Card, CardTitle } from '../../components/ui'

export function HomePage() {
  return (
    <section className="home-page">
      <Card>
        <CardTitle>InnoTrack RDMS</CardTitle>
        <p>This is your landing page. SuperAdmin tools are isolated under /superadmin.</p>
        <Link to="/superadmin">
          <Button>Open SuperAdmin Dashboard</Button>
        </Link>
      </Card>
    </section>
  )
}

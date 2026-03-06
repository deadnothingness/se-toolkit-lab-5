import { useState, useEffect } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
)

const STORAGE_KEY = 'api_key'

interface ScoreBucket {
  bucket: string
  count: number
}

interface ScoreResponse {
  lab_id: string
  buckets: ScoreBucket[]
}

interface TimelineEntry {
  date: string
  count: number
}

interface TimelineResponse {
  lab_id: string
  timeline: TimelineEntry[]
}

interface PassRateEntry {
  task_id: string
  pass_rate: number
  submissions: number
}

interface PassRatesResponse {
  lab_id: string
  pass_rates: PassRateEntry[]
}

interface LabOption {
  id: string
  title: string
}

const AVAILABLE_LABS: LabOption[] = [
  { id: 'lab-04', title: 'Lab 4' },
  { id: 'lab-05', title: 'Lab 5' },
]

interface DashboardProps {
  onDisconnect: () => void
}

export default function Dashboard({ onDisconnect }: DashboardProps) {
  const [selectedLab, setSelectedLab] = useState<string>('lab-04')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [scoreData, setScoreData] = useState<ScoreResponse | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(
    null,
  )
  const [passRatesData, setPassRatesData] = useState<PassRatesResponse | null>(
    null,
  )

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY)
    if (!token) return

    const fetchDashboardData = async () => {
      setLoading(true)
      setError(null)

      try {
        const headers = { Authorization: `Bearer ${token}` }

        const [scoresRes, timelineRes, passRatesRes] = await Promise.all([
          fetch(`/analytics/scores?lab=${selectedLab}`, { headers }),
          fetch(`/analytics/timeline?lab=${selectedLab}`, { headers }),
          fetch(`/analytics/pass-rates?lab=${selectedLab}`, { headers }),
        ])

        if (!scoresRes.ok) {
          throw new Error(`Scores: HTTP ${scoresRes.status}`)
        }
        if (!timelineRes.ok) {
          throw new Error(`Timeline: HTTP ${timelineRes.status}`)
        }
        if (!passRatesRes.ok) {
          throw new Error(`Pass rates: HTTP ${passRatesRes.status}`)
        }

        const scores: ScoreResponse = await scoresRes.json()
        const timeline: TimelineResponse = await timelineRes.json()
        const passRates: PassRatesResponse = await passRatesRes.json()

        setScoreData(scores)
        setTimelineData(timeline)
        setPassRatesData(passRates)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [selectedLab])

  const scoreChartData = {
    labels: scoreData?.buckets.map((b) => b.bucket) ?? [],
    datasets: [
      {
        label: 'Score Distribution',
        data: scoreData?.buckets.map((b) => b.count) ?? [],
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgb(53, 162, 235)',
        borderWidth: 1,
      },
    ],
  }

  const timelineChartData = {
    labels: timelineData?.timeline.map((t) => t.date) ?? [],
    datasets: [
      {
        label: 'Submissions Over Time',
        data: timelineData?.timeline.map((t) => t.count) ?? [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.1,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
      },
    },
  }

  if (loading) {
    return (
      <div>
        <header className="app-header">
          <h1>Dashboard</h1>
          <button className="btn-disconnect" onClick={onDisconnect}>
            Disconnect
          </button>
        </header>
        <p>Loading dashboard data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <header className="app-header">
          <h1>Dashboard</h1>
          <button className="btn-disconnect" onClick={onDisconnect}>
            Disconnect
          </button>
        </header>
        <p className="error">Error: {error}</p>
      </div>
    )
  }

  return (
    <div>
      <header className="app-header">
        <h1>Dashboard</h1>
        <button className="btn-disconnect" onClick={onDisconnect}>
          Disconnect
        </button>
      </header>

      <div className="dashboard-controls">
        <label htmlFor="lab-select">Select Lab: </label>
        <select
          id="lab-select"
          value={selectedLab}
          onChange={(e) => setSelectedLab(e.target.value)}
        >
          {AVAILABLE_LABS.map((lab) => (
            <option key={lab.id} value={lab.id}>
              {lab.title}
            </option>
          ))}
        </select>
      </div>

      <div className="dashboard-content">
        <div className="chart-container">
          <h2>Score Distribution</h2>
          <Bar data={scoreChartData} options={chartOptions} />
        </div>

        <div className="chart-container">
          <h2>Submissions Over Time</h2>
          <Line data={timelineChartData} options={chartOptions} />
        </div>

        <div className="chart-container">
          <h2>Pass Rates by Task</h2>
          <table>
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Pass Rate</th>
                <th>Submissions</th>
              </tr>
            </thead>
            <tbody>
              {passRatesData?.pass_rates.map((pr) => (
                <tr key={pr.task_id}>
                  <td>{pr.task_id}</td>
                  <td>{(pr.pass_rate * 100).toFixed(1)}%</td>
                  <td>{pr.submissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

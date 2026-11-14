import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { money, monthLabel } from '../services/format.js'
import { Empty } from './common.jsx'

const colors = ['#7650b8', '#a18ac5', '#d599b1', '#b499d9', '#b1a5c5', '#e1cce8', '#91849f']
export function CategoryChart({ data }) {
  const rows = data.filter((d) => d.tipo === 'saida' && d.total_centavos > 0)
  if (!rows.length)
    return (
      <Empty title="Um mapa dos seus gastos">
        Registre uma saída para ver a distribuição por categoria.
      </Empty>
    )
  return (
    <div className="donut-layout">
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart accessibilityLayer>
            <Pie
              data={rows}
              dataKey="total_centavos"
              nameKey="nome"
              innerRadius="58%"
              outerRadius="84%"
              isAnimationActive={false}
              paddingAngle={4}
              stroke="none"
            >
              {rows.map((r, i) => (
                <Cell key={r.id} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => money(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        {rows.map((r, i) => (
          <div key={r.id}>
            <span className="legend-dot" style={{ background: colors[i % colors.length] }} />
            <span>{r.nome}</span>
            <strong>{r.percentual.toFixed(0)}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
export function SourceChart({ data }) {
  if (!data.some((r) => r.entradas_centavos || r.saidas_centavos))
    return <Empty title="Sem movimentações neste período" />
  return (
    <div className="large-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} accessibilityLayer margin={{ left: 0, right: 16, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#eae6f0" />
          <XAxis dataKey="nome" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            tickFormatter={(v) => `R$ ${v / 100}`}
            tick={{ fontSize: 10 }}
            width={75}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(v) => money(v)} />
          <Legend />
          <Bar
            isAnimationActive={false}
            dataKey="entradas_centavos"
            name="Entradas"
            fill="#7650b8"
            radius={[5, 5, 0, 0]}
            maxBarSize={38}
          />
          <Bar
            isAnimationActive={false}
            dataKey="saidas_centavos"
            name="Saídas"
            fill="#d599b1"
            radius={[5, 5, 0, 0]}
            maxBarSize={38}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
export function ProjectionChart({ data }) {
  return (
    <div className="large-chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} accessibilityLayer margin={{ left: 10, right: 20 }}>
          <defs>
            <linearGradient id="projection" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7650b8" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7650b8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 5" vertical={false} />
          <XAxis
            dataKey="mes"
            tickFormatter={(v) => monthLabel(v).split(' de ')[0]}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$ ${v / 100}`}
            tick={{ fontSize: 10 }}
            width={85}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip labelFormatter={monthLabel} formatter={(v) => money(v)} />
          <Area
            isAnimationActive={false}
            type="monotone"
            dataKey="saldo_centavos"
            name="Saldo projetado"
            stroke="#7650b8"
            fill="url(#projection)"
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

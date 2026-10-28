import {useMemo,useRef,useState} from 'react'
import {Popover} from 'radix-ui'
import gsap from 'gsap'
import {useGSAP} from '@gsap/react'
import {useWorkspace} from '../data/WorkspaceProvider'
import {businessDate,formatMoney} from '../domain/money'
import {profitChart} from '../domain/profit-chart'

gsap.registerPlugin(useGSAP)

export function ProfitChart() {
  const {records}=useWorkspace()
  const [period,setPeriod]=useState<'weekly'|'monthly'>('weekly')
  const root=useRef<HTMLElement>(null),amount=useRef<HTMLElement>(null)
  const today=businessDate()
  const points=useMemo(()=>profitChart(records,today,period),[records,today,period])
  const earnings=points.reduce((sum,p)=>sum+p.earnings,0),costs=points.reduce((sum,p)=>sum+p.costs,0),net=earnings-costs
  const maximum=Math.max(100,...points.flatMap(p=>[p.earnings,p.costs]))
  useGSAP(()=>{
    const media=gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)',()=>{
      gsap.fromTo('.profit-bar',{scaleY:0},{scaleY:1,duration:.65,stagger:.025,ease:'power3.out',transformOrigin:'bottom center'})
      const counter={value:0}
      gsap.to(counter,{value:Math.abs(net),duration:.7,ease:'power3.out',onUpdate:()=>{if(amount.current)amount.current.textContent=formatMoney(Math.round(counter.value))}})
    })
    return()=>media.revert()
  },{scope:root,dependencies:[points,net],revertOnUpdate:true})
  return <section className="home-recent profit-section" ref={root} aria-labelledby="profit-heading">
    <div className="section-heading"><h2 id="profit-heading">Profit & costs</h2></div>
    <div className="profit-card">
      <div className="profit-heading"><div><span>{net<0?'Net loss':'Net profit'}</span><strong ref={amount} className={net<0?'profit-loss':''}>{formatMoney(Math.abs(net))}</strong></div>
        <div className="period-control" role="group" aria-label="Chart period">{(['weekly','monthly'] as const).map(value=><button key={value} aria-pressed={period===value} onClick={()=>setPeriod(value)}>{value==='weekly'?'Weekly':'Monthly'}</button>)}</div>
      </div>
      <p className="profit-dates">{new Date(`${today}T00:00:00Z`).toLocaleDateString('en-IN',{month:'long',year:'numeric',timeZone:'UTC'})} · {period==='weekly'?'This week, Monday–Sunday':'This month, grouped by date'}</p>
      <div className="profit-legend"><span><i className="earnings-key"/>Earnings <b>{formatMoney(earnings)}</b></span><span><i className="costs-key"/>Costs <b>{formatMoney(costs)}</b></span></div>
      <div className="profit-plot"><div className="profit-grid" aria-hidden="true"><span>{formatMoney(maximum)}</span><span>{formatMoney(Math.round(maximum/2))}</span><span>₹0</span></div><div className="profit-groups">
        {points.map(point=><Popover.Root key={`${period}-${point.from}`}><Popover.Trigger asChild><button className="profit-group" aria-label={`${point.label}: earnings ${formatMoney(point.earnings)}, costs ${formatMoney(point.costs)}, ${point.earnings>=point.costs?'profit':'loss'} ${formatMoney(Math.abs(point.earnings-point.costs))}`}><span className="profit-bars"><span className="profit-bar earnings-bar" style={{height:`${point.earnings/maximum*100}%`}}/><span className="profit-bar costs-bar" style={{height:`${point.costs/maximum*100}%`}}/></span><span className="profit-label">{point.label}</span></button></Popover.Trigger><Popover.Portal><Popover.Content className="profit-tooltip" side="top" sideOffset={8} collisionPadding={16} onOpenAutoFocus={event=>event.preventDefault()}><strong>{point.from===point.to?point.from:`${point.from} – ${point.to}`}</strong><dl><div><dt>Earnings</dt><dd>{formatMoney(point.earnings)}</dd></div><div><dt>Costs</dt><dd>{formatMoney(point.costs)}</dd></div><div><dt>{point.earnings>=point.costs?'Profit':'Loss'}</dt><dd>{formatMoney(Math.abs(point.earnings-point.costs))}</dd></div></dl><Popover.Arrow className="profit-tooltip-arrow"/></Popover.Content></Popover.Portal></Popover.Root>)}
      </div></div>
      {earnings===0&&costs===0&&<p className="profit-empty">Your chart will fill as work and expenses are recorded.</p>}
      <p className="profit-footnote">Based on recorded completed work and expenses. Tap a pair for details.</p>
    </div>
  </section>
}

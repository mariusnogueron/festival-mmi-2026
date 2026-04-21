/**
 * Canvas-based Minitel terminal — renders directly as a Three.js texture
 * on a plane mesh, no CSS transform issues.
 * Screen mesh: 1.6 × 1.2 three.js units   Canvas: 640 × 480 px
 */
import { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const CW = 640, CH = 480
const FS = 20, LH = 20          // font-size, line-height (px)
const ROWS = CH / LH            // 24

/* ── Palette ─────────────────────────────────────────────────────── */
const C = {
  bg:  '#000e02', wh: '#e8ffe8', cy: '#00ffee',
  ye:  '#ffff44', gn: '#44ff66', mg: '#ff44ff',
  rd:  '#ff4444', dim:'#1e5a1e',
}

/* ── Data ────────────────────────────────────────────────────────── */
const ARTICLES = [
  { id:1, nom:'MERGUEZ FRITES',   prix:8.50,  stand:'STAND B3' },
  { id:2, nom:'BURGER FROMAGE',   prix:9.00,  stand:'RESTO A'  },
  { id:3, nom:'T-SHIRT MMI',      prix:20.00, stand:'MERCH'    },
  { id:4, nom:'PASS 1 JOUR',      prix:15.00, stand:'BILLETS'  },
  { id:5, nom:'PASS WEEKEND',     prix:25.00, stand:'BILLETS'  },
  { id:6, nom:'BIERE ARTISANALE', prix:4.50,  stand:'BAR'      },
  { id:7, nom:'JUS BIO',          prix:3.00,  stand:'BAR'      },
  { id:8, nom:'TOTE BAG MMI',     prix:12.00, stand:'MERCH'    },
]
const STATUS_CLR = { 'EN COURS':C.ye, 'CONFIRME':C.cy, 'LIVRE':C.dim }
const seedOrders = () => [
  { id:4521, art:'MERGUEZ FRITES',   qte:2, stand:'STAND B3', hh:'14:32', status:'EN COURS' },
  { id:4520, art:'PASS WEEKEND',     qte:1, stand:'BILLETS',  hh:'14:28', status:'CONFIRME' },
  { id:4519, art:'T-SHIRT MMI',      qte:3, stand:'MERCH',    hh:'14:15', status:'LIVRE'    },
  { id:4518, art:'BIERE ARTISANALE', qte:4, stand:'BAR',      hh:'14:01', status:'CONFIRME' },
  { id:4517, art:'BURGER FROMAGE',   qte:1, stand:'RESTO A',  hh:'13:55', status:'LIVRE'    },
]
const tnow = () => new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})

/* ── Line helpers ─────────────────────────────────────────────────── */
const L  = (text='', color=C.wh, bg=C.bg) => ({ text, color, bg })
const LH_= (text='')                       => ({ text, color:C.bg, bg:C.cy })  // header (cyan bar)
const LF = (text='')                       => ({ text, color:C.wh, bg:C.dim }) // footer (dark bar)
const LE = ()                              => L()

/* ── Page builders ───────────────────────────────────────────────── */
function bootLines(pct) {
  const p   = Math.min(pct, 100)
  const bar = Math.round(p / 100 * 52)
  return [
    LE(), LE(), LE(), LE(),
    L('      FESTIVAL MMI 2026', C.ye),
    L('      ══════════════════', C.wh),
    LE(), LE(),
    L('      Connexion en cours...', C.cy),
    LE(),
    L('  [' + '█'.repeat(bar) + '░'.repeat(52 - bar) + ']', C.gn),
    LE(), LE(), LE(), LE(), LE(), LE(), LE(), LE(), LE(), LE(), LE(), LE(),
    LF(` 3615 FESTIMMI  v1.0  ${p}%`),
  ]
}

function welcomeLines() {
  return [
    LH_(' 3615 FESTIMMI                        MMI 2026'),
    LE(), LE(),
    L('      ╔══════════════════════════╗', C.cy),
    L('      ║   FESTIVAL  MMI  2026    ║', C.cy),
    L('      ║   23 & 24 MAI 2026       ║', C.cy),
    L('      ║   IUT DE Troyes          ║', C.cy),
    L('      ╚══════════════════════════╝', C.cy),
    LE(), LE(),
    L('  Bienvenue sur le service de', C.wh),
    L('  commandes du Festival MMI !', C.wh),
    LE(), LE(),
    L('  ► Appuyez sur ENTREE pour', C.ye),
    L('    acceder au service', C.ye),
    LE(), LE(), LE(), LE(), LE(), LE(),
    L('  festimmi@iut-nancy.fr', C.dim),
    LF(' ENTREE: continuer'),
  ]
}

function menuLines() {
  return [
    LH_(' FESTIMMI — MENU PRINCIPAL'),
    LE(), LE(),
    L('  Choisissez votre service :', C.wh),
    LE(),
    L('  [1]  COMMANDES EN COURS', C.ye),
    L('       Suivez vos commandes live', C.dim),
    LE(),
    L('  [2]  PASSER UNE COMMANDE', C.ye),
    L('       Food, boissons, merch...', C.dim),
    LE(),
    L('  [3]  PROGRAMME DU FESTIVAL', C.ye),
    L('       Concerts, ateliers, expos', C.dim),
    LE(),
    L('  [4]  INFOS PRATIQUES', C.ye),
    L('       Acces, tarifs, contacts', C.dim),
    LE(), LE(), LE(),
    L('  Tapez le numero de votre choix', C.gn),
    LE(),
    LF(' ANNUL: quitter'),
  ]
}

function ordersLines(orders, tick) {
  const lines = [ LH_(' COMMANDES EN COURS — LIVE'), LE() ]
  orders.slice(0, 5).forEach(o => {
    lines.push(
      L(`  #${o.id}  ${String(o.art).padEnd(22)} x${o.qte}`, C.wh),
      L(`         ${String(o.stand).padEnd(12)} ${o.hh}`, C.dim),
      { text:`         ► ${o.status}`, color: STATUS_CLR[o.status] || C.wh, bg: C.bg },
      LE(),
    )
  })
  while (lines.length < 23) lines.push(LE())
  lines.push(LF(` Maj auto dans ${10 - (tick % 10)}s  |  RETOUR: menu`))
  return lines.slice(0, ROWS)
}

function formLines(step, artIdx, qty) {
  const art = ARTICLES[artIdx]
  const lines = [ LH_(` NOUVELLE COMMANDE — ETAPE ${step + 1}/3`), LE() ]
  if (step === 0) {
    lines.push(L('  Choisissez un article :', C.wh), LE())
    ARTICLES.forEach(a =>
      lines.push(L(`  [${a.id}]  ${String(a.nom).padEnd(22)} ${a.prix.toFixed(2)} E`,
        a.id === artIdx + 1 ? C.cy : C.ye))
    )
    while (lines.length < 22) lines.push(LE())
    lines.push(LE(), LF(' ANNUL: menu'))
  } else if (step === 1) {
    lines.push(
      L(`  Article  : ${art?.nom}`, C.cy),
      L(`  Prix     : ${art?.prix.toFixed(2)} EUR`, C.wh),
      L(`  Stand    : ${art?.stand}`, C.wh),
      LE(), LE(), LE(), LE(),
      L('  Quantite [1-9] :', C.gn),
    )
    while (lines.length < 23) lines.push(LE())
    lines.push(LF(' ANNUL: menu'))
  } else {
    lines.push(
      L(`  Article  : ${art?.nom}`, C.cy),
      L(`  Quantite : ${qty}`, C.wh),
      L(`  Total    : ${(art?.prix * qty).toFixed(2)} EUR`, C.ye),
      L(`  Stand    : ${art?.stand}`, C.wh),
      LE(), LE(), LE(), LE(),
      L('  Confirmer la commande ?', C.gn),
      L('  ENTREE: oui   ESC: annuler', C.wh),
    )
    while (lines.length < 23) lines.push(LE())
    lines.push(LF(' RETOUR: etape prev'))
  }
  return lines.slice(0, ROWS)
}

function confirmedLines(orderId, art, qty) {
  return [
    LH_(' COMMANDE CONFIRMEE'),
    LE(), LE(), LE(),
    L('  ╔═══════════════════════════════╗', C.gn),
    L('  ║  COMMANDE ENREGISTREE !       ║', C.gn),
    L('  ╚═══════════════════════════════╝', C.gn),
    LE(),
    L(`  N° DE COMMANDE : #${orderId}`, C.ye),
    LE(),
    L(`  Article  : ${art?.nom}`, C.wh),
    L(`  Quantite : ${qty}`, C.wh),
    L(`  Stand    : ${art?.stand}`, C.wh),
    L(`  Montant  : ${(art?.prix * qty).toFixed(2)} EUR`, C.cy),
    LE(), LE(),
    L('  Presentez-vous au stand avec', C.dim),
    L(`  votre numero #${orderId}`, C.dim),
    LE(), LE(), LE(),
    L('  Appuyez sur ENTREE...', C.ye),
    LF(' ENTREE: retour menu'),
  ]
}

function programmeLines() {
  return [
    LH_(' PROGRAMME — FESTIVAL MMI 2026'),
    LE(),
    L('  SAMEDI 23 MAI', C.ye),
    L('  ────────────────────────────────', C.dim),
    L('  10:00  Ouverture des portes', C.wh),
    L('  11:00  Atelier WebXR (Salle 201)', C.wh),
    L('  12:30  Pause dejeuner', C.dim),
    L('  14:00  Conference: IA & Design', C.wh),
    L('  15:30  Workshop 3D / Blender', C.wh),
    L('  17:00  Expo projets etudiants', C.wh),
    L('  19:00  DJ SET — Soiree ouverture', C.mg),
    LE(),
    L('  DIMANCHE 24 MAI', C.ye),
    L('  ────────────────────────────────', C.dim),
    L('  10:00  Ateliers creatifs', C.wh),
    L('  12:00  Conference: Metiers MMI', C.wh),
    L('  14:00  Remise des prix', C.wh),
    L('  16:00  Cloture & Fiesta finale', C.mg),
    LE(), LE(), LE(), LE(),
    LF(' RETOUR: menu'),
  ]
}

function infosLines() {
  return [
    LH_(' INFOS PRATIQUES'),
    LE(),
    L('  ACCES', C.cy),
    L('  IUT de Troyes — Dept. MMI', C.wh),
    L('  9 Rue Quebec, 10430 Rosières-près-Troyes', C.wh),
    L('  Bus: Ligne 6 — Arret Iut', C.dim),
    LE(),
    L('  HORAIRES', C.cy),
    L('  Sam 23 Mai : 10h00 — 00h00', C.wh),
    L('  Dim 24 Mai : 10h00 — 18h00', C.wh),
    LE(),
    L('  TARIFS', C.cy),
    L('  Pass 1 Jour  : 15,00 EUR', C.wh),
    L('  Pass Weekend : 25,00 EUR', C.wh),
    L('  Etudiants MMI: GRATUIT', C.gn),
    LE(),
    L('  CONTACT', C.cy),
    L('  festimmi@iut-nancy.fr', C.wh),
    L('  instagram: @festival_mmi', C.wh),
    LE(), LE(), LE(),
    LF(' RETOUR: menu'),
  ]
}

function buildLines({ page, bootPct, orders, tick, formStep, artIdx, qty, confirmedData }) {
  switch (page) {
    case 'BOOT':       return bootLines(bootPct)
    case 'WELCOME':    return welcomeLines()
    case 'MENU':       return menuLines()
    case 'ORDERS':     return ordersLines(orders, tick)
    case 'ORDER_FORM': return formLines(formStep, artIdx, qty)
    case 'CONFIRMED':  return confirmedData
      ? confirmedLines(confirmedData.orderId, confirmedData.art, confirmedData.qty)
      : menuLines()
    case 'PROGRAMME':  return programmeLines()
    case 'INFOS':      return infosLines()
    default:           return Array(ROWS).fill(null).map(LE)
  }
}

/* ── R3F component ───────────────────────────────────────────────── */
export default function MinitelTerminal() {
  const [page, setPage]                   = useState('BOOT')
  const [bootPct, setBootPct]             = useState(0)
  const [orders, setOrders]               = useState(seedOrders)
  const [tick, setTick]                   = useState(0)
  const [formStep, setFormStep]           = useState(0)
  const [artIdx, setArtIdx]               = useState(0)
  const [qty, setQty]                     = useState(1)
  const [nextId, setNextId]               = useState(4522)
  const [confirmedData, setConfirmedData] = useState(null)
  const dirty = useRef(true)

  /* Always-fresh state for keydown handler */
  const stateRef = useRef({})
  stateRef.current = { page, bootPct, orders, tick, formStep, artIdx, qty, nextId, confirmedData }

  /* Mark dirty on every render */
  useEffect(() => { dirty.current = true })

  /* Boot animation */
  useEffect(() => {
    if (page !== 'BOOT') return
    let p = 0
    const id = setInterval(() => {
      p += 2; setBootPct(p)
      if (p >= 100) { clearInterval(id); setTimeout(() => setPage('WELCOME'), 400) }
    }, 50)
    return () => clearInterval(id)
  }, [page])

  /* Live countdown tick */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  /* Auto-promote order statuses every 10 s */
  useEffect(() => {
    if (tick % 10 !== 0 || tick === 0) return
    setOrders(prev => prev.map(o => {
      if (o.status === 'EN COURS') return { ...o, status: 'CONFIRME' }
      if (o.status === 'CONFIRME' && Math.random() > 0.6) return { ...o, status: 'LIVRE' }
      return o
    }))
  }, [tick])

  /* Global keydown (capture phase so orbit controls don't interfere) */
  useEffect(() => {
    const handler = e => {
      if (!['Enter','Escape','Backspace'].includes(e.key) && !/^[0-9]$/.test(e.key)) return
      e.preventDefault(); e.stopPropagation()
      const { page:p, formStep:fs, artIdx:ai, qty:q, nextId:ni } = stateRef.current
      if (p === 'WELCOME') { if (e.key === 'Enter') setPage('MENU'); return }
      if (p === 'MENU') {
        if (e.key === '1') setPage('ORDERS')
        else if (e.key === '2') { setFormStep(0); setPage('ORDER_FORM') }
        else if (e.key === '3') setPage('PROGRAMME')
        else if (e.key === '4') setPage('INFOS')
        return
      }
      if (['ORDERS','PROGRAMME','INFOS'].includes(p)) {
        if (['Enter','Escape','Backspace'].includes(e.key)) setPage('MENU')
        return
      }
      if (p === 'ORDER_FORM') {
        if (e.key === 'Escape') { setPage('MENU'); return }
        if (fs === 0 && /^[1-8]$/.test(e.key)) { setArtIdx(+e.key - 1); setFormStep(1) }
        if (fs === 1 && /^[1-9]$/.test(e.key)) { setQty(+e.key); setFormStep(2) }
        if (fs === 2) {
          if (e.key === 'Enter') {
            const art = ARTICLES[ai]
            setNextId(n => n + 1)
            setOrders(prev => [{
              id: ni, art: art.nom, qte: q, stand: art.stand, hh: tnow(), status: 'EN COURS',
            }, ...prev].slice(0, 12))
            setConfirmedData({ orderId: ni, art, qty: q })
            setPage('CONFIRMED'); setFormStep(0)
          }
          if (e.key === 'Backspace') setFormStep(1)
        }
        return
      }
      if (p === 'CONFIRMED' && ['Enter','Escape'].includes(e.key)) setPage('MENU')
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  /* Off-screen canvas + CanvasTexture */
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = CW; c.height = CH
    return c
  }, [])

  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas)
    t.minFilter = THREE.LinearFilter
    t.magFilter = THREE.LinearFilter
    return t
  }, [canvas])

  /* Ensure VT323 is loaded before first draw */
  useEffect(() => {
    document.fonts.load(`${FS}px VT323`).then(() => { dirty.current = true })
  }, [])

  /* Draw on every frame when dirty */
  useFrame(() => {
    if (!dirty.current) return
    dirty.current = false
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, CW, CH)
    ctx.font = `${FS}px 'VT323', 'Courier New', monospace`
    ctx.textBaseline = 'top'

    const lines = buildLines(stateRef.current)
    lines.forEach((line, i) => {
      const y = i * LH
      ctx.fillStyle = line.bg
      ctx.fillRect(0, y, CW, LH)
      ctx.fillStyle = line.color
      ctx.fillText(line.text || '', 4, y + 1)
    })

    texture.needsUpdate = true
  })

  return (
    <mesh>
      <planeGeometry args={[1.6, 1.2]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

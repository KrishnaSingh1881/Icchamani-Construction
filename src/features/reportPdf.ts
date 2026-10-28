import type {ReportData} from '../domain/reports'

let font:Promise<string>|undefined
function reportFont() {
  return font??=(async()=>{
    const response=await fetch('/fonts/NotoSans-Regular.ttf')
    if(!response.ok)throw new Error('Report font is unavailable. Reopen while connected once, then try again.')
    const bytes=new Uint8Array(await response.arrayBuffer())
    if(bytes.length<10000||bytes[0]!==0||bytes[1]!==1)throw new Error('Report font could not be loaded.')
    let binary='';for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192))
    return btoa(binary)
  })().catch(error=>{font=undefined;throw error})
}
export async function createReportPdf(report:ReportData) {
  const [{jsPDF},encodedFont]=await Promise.all([import('jspdf'),reportFont()])
  const doc=new jsPDF({unit:'mm',format:'a4',compress:true})
  doc.addFileToVFS('NotoSans.ttf',encodedFont);doc.addFont('NotoSans.ttf','NotoSans','normal');doc.setFont('NotoSans')
  doc.setProperties({title:report.title,author:'Icchamani Construction',creator:'GaadiHisaab'})
  let y=0
  function pageHeader() {
    doc.setFontSize(16);const titleLines=doc.splitTextToSize(report.title,178) as string[]
    const periodY=28+titleLines.length*7;const bandHeight=periodY+10
    doc.setFillColor(247,241,232);doc.rect(0,0,210,bandHeight,'F');doc.setTextColor(47,45,41)
    doc.setFontSize(10);doc.text('ICCHAMANI CONSTRUCTION',16,15)
    doc.setFontSize(16);doc.text(titleLines,16,26)
    doc.setFontSize(9);doc.text(report.period,16,periodY)
    doc.setTextColor(105,100,94);doc.text('Date',16,bandHeight+7);doc.text('Entry details',45,bandHeight+7);doc.text('Amount',194,bandHeight+7,{align:'right'});y=bandHeight+14
  }
  function ensure(height:number) {if(y+height>274){doc.addPage();pageHeader()}}
  pageHeader();doc.setFontSize(9)
  for(const row of report.rows) {
    const lines=doc.splitTextToSize(row.detail.replace(/[\u0000-\u0008\u000b-\u001f]/g,''),109) as string[]
    const amount=doc.splitTextToSize(row.amount,35) as string[]
    let offset=0
    do {
      ensure(21);const capacity=Math.max(1,Math.floor((274-y-7)/4.5));const chunk=lines.slice(offset,offset+capacity);const last=offset+chunk.length>=lines.length
      const height=Math.max(chunk.length,last?amount.length:1)*4.5+7
      ensure(Math.min(height,198));doc.setTextColor(47,45,41)
      doc.text(offset===0?row.date:'continued',16,y);doc.text(chunk,45,y)
      if(last)doc.text(amount,194,y,{align:'right'})
      y+=height;doc.setDrawColor(225,221,215);doc.line(16,y-3,194,y-3);offset+=chunk.length
    }while(offset<lines.length)
  }
  if(!report.rows.length){doc.text('No accepted entries in this period.',16,y);y+=12}
  for(const [label,value] of report.summary){ensure(10);doc.setFontSize(10);doc.text(label,16,y);doc.text(value,194,y,{align:'right'});y+=9}
  const note=doc.splitTextToSize(report.note,178) as string[];ensure(note.length*4+10);doc.setFontSize(8);doc.setTextColor(105,100,94);doc.text(note,16,y+5)
  const pages=doc.getNumberOfPages()
  for(let page=1;page<=pages;page++){doc.setPage(page);doc.setFontSize(8);doc.setTextColor(105,100,94);doc.text(`Generated ${new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST`,16,287);doc.text(`${page} / ${pages}`,194,287,{align:'right'})}
  return doc.output('blob')
}

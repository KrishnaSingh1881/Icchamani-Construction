import {randomBytes,scryptSync,createCipheriv,createDecipheriv} from 'node:crypto'
import {createReadStream,createWriteStream} from 'node:fs'
import {appendFile,open,rm,stat} from 'node:fs/promises'
import {pipeline} from 'node:stream/promises'

const [mode,input,output]=process.argv.slice(2)
if(!['encrypt','decrypt'].includes(mode)||!input||!output||input===output)throw new Error('Usage: backup-crypto.mjs encrypt|decrypt input output')
const password=process.env.BACKUP_ENCRYPTION_KEY??''
if(password.length<32)throw new Error('BACKUP_ENCRYPTION_KEY must contain at least 32 characters.')
const magic=Buffer.from('GHBACKUP1')
let created=false
try {
  const out=await open(output,'wx',0o600);created=true
  if(mode==='encrypt') {
    const salt=randomBytes(16),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',scryptSync(password,salt,32),iv)
    await out.write(Buffer.concat([magic,salt,iv]));await out.close()
    await pipeline(createReadStream(input),cipher,createWriteStream(output,{flags:'a',mode:0o600}))
    await appendFile(output,cipher.getAuthTag())
  }else {
    await out.close();const size=(await stat(input)).size
    if(size<magic.length+16+12+16)throw new Error('Invalid encrypted backup.')
    const file=await open(input,'r');const header=Buffer.alloc(magic.length+28),tag=Buffer.alloc(16)
    try{await file.read(header,0,header.length,0);await file.read(tag,0,16,size-16)}finally{await file.close()}
    if(!header.subarray(0,magic.length).equals(magic))throw new Error('Unrecognised backup format.')
    const salt=header.subarray(magic.length,magic.length+16),iv=header.subarray(magic.length+16)
    const decipher=createDecipheriv('aes-256-gcm',scryptSync(password,salt,32),iv);decipher.setAuthTag(tag)
    await pipeline(createReadStream(input,{start:header.length,end:size-17}),decipher,createWriteStream(output,{flags:'w',mode:0o600}))
  }
}catch(error){if(created)await rm(output,{force:true});throw new Error('Backup operation failed. Check the key and file integrity; no incomplete output was kept.',{cause:error})}

"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { fcfa } from "@/lib/pricing";

const rowsOf = (d) => [
  ["Événement", d.eventName], ["Date", d.date], ["Nom", d.lastName], ["Prénom(s)", d.firstName],
  ["Téléphone", d.phone], ["E-mail", d.email], ["Places", d.places], ["Produits", d.products || "–"],
  ["Montant payé", fcfa(d.total)], ["N° d’identification", d.code],
];
const loadImg = (src) => new Promise((ok) => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
function wrap(c, t, x, y, w, lh) {
  let l = "";
  t.split(" ").forEach((k) => { const tt = l ? l + " " + k : k; if (c.measureText(tt).width > w && l) { c.fillText(l, x, y); y += lh; l = k; } else l = tt; });
  c.fillText(l, x, y);
}
async function draw(d, qr) {
  const W = 800, H = 1120, cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  c.strokeStyle = "#bbb"; c.setLineDash([10, 8]); c.lineWidth = 3; c.strokeRect(20, 20, W - 40, H - 40); c.setLineDash([]);
  c.fillStyle = "#1b1840"; c.textAlign = "left"; c.font = "bold 44px Georgia,serif"; c.fillText("Reçu de paiement", 60, 110);
  let y = 190;
  rowsOf(d).forEach(([a, b]) => {
    c.font = "24px system-ui,sans-serif"; c.fillStyle = "#615d85"; c.textAlign = "left"; c.fillText(a, 60, y);
    c.fillStyle = "#1b1840"; c.font = "bold 26px system-ui,sans-serif"; c.textAlign = "right"; c.fillText(b, W - 60, y);
    c.strokeStyle = "#d9d5ec"; c.lineWidth = 2; c.beginPath(); c.moveTo(60, y + 22); c.lineTo(W - 60, y + 22); c.stroke(); y += 66;
  });
  if (d.quote) { c.font = "italic 24px Georgia,serif"; c.fillStyle = "#615d85"; c.textAlign = "center"; wrap(c, "“" + d.quote + "”", W / 2, 885, W - 160, 34); }
  const q = await loadImg(qr); if (q) c.drawImage(q, 60, 975, 120, 120);
  const im = await loadImg(d.signatureImg);
  c.fillStyle = "#1b1840";
  if (im) { const s = Math.min(60 / im.height, 200 / im.width); c.drawImage(im, W - 60 - im.width * s, 1040 - im.height * s, im.width * s, im.height * s); }
  else { c.font = "italic 36px Georgia,serif"; c.textAlign = "right"; c.fillText(d.signatureText, W - 60, 1035); }
  c.strokeStyle = "#1b1840"; c.lineWidth = 2; c.beginPath(); c.moveTo(W - 300, 1048); c.lineTo(W - 60, 1048); c.stroke();
  c.font = "22px system-ui,sans-serif"; c.fillStyle = "#615d85"; c.textAlign = "right"; c.fillText(d.organizer, W - 60, 1078);
  return cv;
}
function pdfFromJpeg(bytes, w, h) {
  const pw = 420, ph = Math.round((420 * h) / w), enc = new TextEncoder(), parts = [], offs = [];
  let len = 0;
  const add = (x) => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, s) => { offs[n] = len; add(n + " 0 obj\n" + s + "\nendobj\n"); };
  add("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pw + " " + ph + "] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>");
  offs[4] = len;
  add("4 0 obj\n<< /Type /XObject /Subtype /Image /Width " + w + " /Height " + h + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + bytes.length + " >>\nstream\n");
  add(bytes); add("\nendstream\nendobj\n");
  const cs = "q " + pw + " 0 0 " + ph + " 0 0 cm /Im0 Do Q";
  obj(5, "<< /Length " + cs.length + " >>\nstream\n" + cs + "\nendstream");
  const x = len; let t = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) t += ("0000000000" + offs[i]).slice(-10) + " 00000 n \n";
  add(t + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + x + "\n%%EOF");
  return new Blob(parts, { type: "application/pdf" });
}
function save(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

export default function Receipt({ d }) {
  const [qr, setQr] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { QRCode.toDataURL(d.verifyUrl, { margin: 1, width: 240 }).then(setQr).catch(() => {}); }, [d.verifyUrl]);
  const dl = async (kind) => {
    setMsg("");
    try {
      const cv = await draw(d, qr), name = "recu-" + d.code;
      if (kind === "png") save(await new Promise((r) => cv.toBlob(r, "image/png")), name + ".png");
      else {
        const j = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.92));
        save(pdfFromJpeg(new Uint8Array(await j.arrayBuffer()), cv.width, cv.height), name + ".pdf");
      }
    } catch { setMsg("Téléchargement impossible. Faites plutôt une capture d’écran du reçu."); }
  };
  return (
    <>
      <div className="rc">
        <h3>Reçu de paiement</h3>
        {rowsOf(d).map(([a, b]) => <div className="row" key={a}><span>{a}</span><b>{b}</b></div>)}
        {d.quote && <p className="hint" style={{ fontStyle: "italic", textAlign: "center" }}>“{d.quote}”</p>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 }}>
          {qr ? <img className="qr" src={qr} alt="QR code du ticket" /> : <div className="qr" />}
          <div style={{ textAlign: "right" }}>
            {d.signatureImg ? <img src={d.signatureImg} alt="Signature" style={{ maxHeight: 48, maxWidth: 160 }} /> : <span className="sig">{d.signatureText}</span>}
            <br /><small>{d.organizer}</small>
          </div>
        </div>
      </div>
      <div className="g2"><button className="btn" onClick={() => dl("pdf")}>Télécharger en PDF</button><button className="btn" onClick={() => dl("png")}>Télécharger en image (PNG)</button></div>
      <p className="err" role="status">{msg}</p>
    </>
  );
}

import { useRef, type ReactNode } from 'react';

export default function SwipeTable({children}:{children:ReactNode}){
 const drag=useRef<{id:number;x:number;left:number}|null>(null);
 return <div className="comparison-scroll swipe-table" role="region" aria-label="Scrollable challenge table" tabIndex={0}
  onPointerDown={e=>{
   if(e.pointerType!=='mouse'||e.button!==0||e.currentTarget.scrollWidth<=e.currentTarget.clientWidth)return;
   drag.current={id:e.pointerId,x:e.clientX,left:e.currentTarget.scrollLeft};
   e.currentTarget.setPointerCapture(e.pointerId);
   e.currentTarget.classList.add('dragging');
  }}
  onPointerMove={e=>{if(drag.current?.id===e.pointerId){e.preventDefault();e.currentTarget.scrollLeft=drag.current.left+drag.current.x-e.clientX}}}
  onPointerUp={e=>{drag.current=null;e.currentTarget.classList.remove('dragging');if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}
  onPointerCancel={e=>{drag.current=null;e.currentTarget.classList.remove('dragging')}}
  onLostPointerCapture={e=>{drag.current=null;e.currentTarget.classList.remove('dragging')}}
 >{children}</div>;
}

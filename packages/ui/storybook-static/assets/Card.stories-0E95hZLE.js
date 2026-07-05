import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as h}from"./index-DyTKwKRb.js";import{c as g}from"./clsx-B-dksMZM.js";import{t as b}from"./bundle-mjs-BZSatpsL.js";import"./_commonjsHelpers-Cpj98o6Y.js";const a=h.memo(({children:c,className:m="",variant:u="default",noPadding:p=!1,...x})=>{const f={default:"bg-card text-card-foreground shadow-xl border border-border/50",glass:"glass-card",outline:"bg-transparent border-2 border-border",ghost:"bg-transparent border-none"};return e.jsx("div",{className:b(g("rounded-2xl transition-all duration-500 ease-in-out",!p&&"p-4 sm:p-5 md:p-6",f[u],m)),...x,children:c})});a.displayName="Card";a.__docgenInfo={description:"",methods:[],displayName:"Card",props:{children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},variant:{required:!1,tsType:{name:"union",raw:"'default' | 'glass' | 'outline' | 'ghost'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'glass'"},{name:"literal",value:"'outline'"},{name:"literal",value:"'ghost'"}]},description:"",defaultValue:{value:"'default'",computed:!1}},noPadding:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},className:{defaultValue:{value:"''",computed:!1},required:!1}}};const C={title:"ClickFlash/Card",component:a,tags:["autodocs"]},t={render:()=>e.jsx("div",{className:"p-8 bg-slate-900 min-h-32",children:e.jsxs(a,{children:[e.jsx("h3",{className:"text-white font-bold text-lg mb-2",children:"Album Title"}),e.jsx("p",{className:"text-slate-400 text-sm",children:"Wedding · 12 Jun 2026 · 247 photos"})]})})},s={render:()=>e.jsx("div",{className:"p-8 bg-slate-900",children:e.jsx(a,{children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-white font-bold",children:"Beach Sunset Package"}),e.jsx("p",{className:"text-slate-400 text-sm mt-1",children:"2 selections · €49"})]}),e.jsx("span",{className:"px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium",children:"Paid"})]})})})};var r,l,n;t.parameters={...t.parameters,docs:{...(r=t.parameters)==null?void 0:r.docs,source:{originalSource:`{
  render: () => <div className="p-8 bg-slate-900 min-h-32">\r
      <Card>\r
        <h3 className="text-white font-bold text-lg mb-2">Album Title</h3>\r
        <p className="text-slate-400 text-sm">Wedding · 12 Jun 2026 · 247 photos</p>\r
      </Card>\r
    </div>
}`,...(n=(l=t.parameters)==null?void 0:l.docs)==null?void 0:n.source}}};var d,o,i;s.parameters={...s.parameters,docs:{...(d=s.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: () => <div className="p-8 bg-slate-900">\r
      <Card>\r
        <div className="flex items-center justify-between">\r
          <div>\r
            <h3 className="text-white font-bold">Beach Sunset Package</h3>\r
            <p className="text-slate-400 text-sm mt-1">2 selections · €49</p>\r
          </div>\r
          <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">Paid</span>\r
        </div>\r
      </Card>\r
    </div>
}`,...(i=(o=s.parameters)==null?void 0:o.docs)==null?void 0:i.source}}};const P=["Default","WithActions"];export{t as Default,s as WithActions,P as __namedExportsOrder,C as default};

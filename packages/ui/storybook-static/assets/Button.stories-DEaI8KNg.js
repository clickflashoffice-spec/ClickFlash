import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as m}from"./index-DyTKwKRb.js";import{c as A}from"./clsx-B-dksMZM.js";import{t as C}from"./bundle-mjs-BZSatpsL.js";import"./_commonjsHelpers-Cpj98o6Y.js";const G={primary:`
    bg-primary text-primary-foreground shadow-lg shadow-primary/30
    hover:bg-primary/90 hover:shadow-primary/40
    active:scale-95
    disabled:bg-primary/50 disabled:shadow-none
  `,secondary:`
    bg-secondary text-secondary-foreground shadow-lg shadow-secondary/20
    hover:bg-secondary/90
    active:scale-95
    disabled:bg-secondary/40 disabled:shadow-none
  `,outline:`
    border-2 border-border text-foreground bg-transparent
    hover:bg-muted hover:border-primary/30
    active:scale-95
    disabled:border-muted/50 disabled:text-muted-foreground
  `,ghost:`
    text-muted-foreground bg-transparent
    hover:bg-muted hover:text-foreground
    active:scale-95
    disabled:text-muted/50
  `,danger:`
    bg-danger text-danger-foreground shadow-lg shadow-danger/30
    hover:bg-danger/90
    active:scale-95
    disabled:bg-danger/30
  `,glass:`
    glass text-foreground
    hover:bg-white/20 dark:hover:bg-slate-800/30
    active:scale-95
    disabled:opacity-50
  `,premium:`
    premium-gradient text-white shadow-xl shadow-accent/40
    hover:brightness-110 hover:shadow-accent/50
    active:scale-95
    border border-white/20
  `,success:`
    bg-emerald-600 text-white shadow-lg shadow-emerald-500/30
    hover:bg-emerald-700
    active:scale-95
    disabled:bg-emerald-300
  `},L={sm:"px-3 py-1.5 text-xs font-medium",md:"px-5 py-2.5 text-sm font-semibold",lg:"px-7 py-3.5 text-base font-bold",xl:"px-10 py-5 text-lg font-black tracking-tight",icon:"p-2.5 aspect-square"},a=m.memo(m.forwardRef(({className:P,variant:R="primary",size:k="md",isLoading:i=!1,leftIcon:d,rightIcon:c,fullWidth:q=!1,disabled:T,children:l,...V},D)=>e.jsx("button",{ref:D,className:C(A(`
        inline-flex items-center justify-center gap-2.5
        rounded-xl
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-4 focus:ring-primary/30
        disabled:cursor-not-allowed disabled:opacity-50
      `,G[R],L[k],q&&"w-full",i&&"opacity-80 cursor-wait",P)),disabled:T||i,...V,children:i?e.jsxs("svg",{className:"animate-spin h-5 w-5",xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",children:[e.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),e.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"})]}):e.jsxs(e.Fragment,{children:[d&&e.jsx("span",{className:"flex-shrink-0",children:d}),typeof l=="string"?e.jsx("span",{className:"truncate",children:l}):l,c&&e.jsx("span",{className:"flex-shrink-0",children:c})]})})));a.displayName="Button";a.__docgenInfo={description:"",methods:[],displayName:"Button",props:{variant:{required:!1,tsType:{name:"union",raw:`| 'primary' 
| 'secondary' 
| 'outline' 
| 'ghost' 
| 'danger' 
| 'glass'
| 'premium'
| 'success'`,elements:[{name:"literal",value:"'primary'"},{name:"literal",value:"'secondary'"},{name:"literal",value:"'outline'"},{name:"literal",value:"'ghost'"},{name:"literal",value:"'danger'"},{name:"literal",value:"'glass'"},{name:"literal",value:"'premium'"},{name:"literal",value:"'success'"}]},description:"",defaultValue:{value:"'primary'",computed:!1}},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg' | 'xl' | 'icon'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"},{name:"literal",value:"'xl'"},{name:"literal",value:"'icon'"}]},description:"",defaultValue:{value:"'md'",computed:!1}},isLoading:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},leftIcon:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},rightIcon:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},fullWidth:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};const U={title:"ClickFlash/Button",component:a,tags:["autodocs"],argTypes:{variant:{control:"select",options:["primary","secondary","outline","ghost","danger","glass","premium","success"]},size:{control:"select",options:["sm","md","lg","xl","icon"]},isLoading:{control:"boolean"},fullWidth:{control:"boolean"},disabled:{control:"boolean"}}},r={args:{variant:"primary",children:"Save Album",size:"md"}},s={args:{variant:"premium",children:"Upgrade to Pro",size:"lg"}},t={args:{variant:"danger",children:"Delete Photo",size:"md"}},n={args:{variant:"primary",children:"Syncing…",isLoading:!0,size:"md"}},o={render:()=>e.jsxs("div",{className:"flex flex-wrap gap-3 p-6 bg-slate-900",children:[e.jsx(a,{variant:"primary",children:"Primary"}),e.jsx(a,{variant:"secondary",children:"Secondary"}),e.jsx(a,{variant:"outline",children:"Outline"}),e.jsx(a,{variant:"ghost",children:"Ghost"}),e.jsx(a,{variant:"danger",children:"Danger"}),e.jsx(a,{variant:"glass",children:"Glass"}),e.jsx(a,{variant:"premium",children:"Premium"}),e.jsx(a,{variant:"success",children:"Success"})]})};var u,p,g;r.parameters={...r.parameters,docs:{...(u=r.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    children: 'Save Album',
    size: 'md'
  }
}`,...(g=(p=r.parameters)==null?void 0:p.docs)==null?void 0:g.source}}};var h,v,y;s.parameters={...s.parameters,docs:{...(h=s.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    variant: 'premium',
    children: 'Upgrade to Pro',
    size: 'lg'
  }
}`,...(y=(v=s.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};var x,b,f;t.parameters={...t.parameters,docs:{...(x=t.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    variant: 'danger',
    children: 'Delete Photo',
    size: 'md'
  }
}`,...(f=(b=t.parameters)==null?void 0:b.docs)==null?void 0:f.source}}};var w,B,j;n.parameters={...n.parameters,docs:{...(w=n.parameters)==null?void 0:w.docs,source:{originalSource:`{
  args: {
    variant: 'primary',
    children: 'Syncing…',
    isLoading: true,
    size: 'md'
  }
}`,...(j=(B=n.parameters)==null?void 0:B.docs)==null?void 0:j.source}}};var S,N,z;o.parameters={...o.parameters,docs:{...(S=o.parameters)==null?void 0:S.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3 p-6 bg-slate-900">\r
      <Button variant="primary">Primary</Button>\r
      <Button variant="secondary">Secondary</Button>\r
      <Button variant="outline">Outline</Button>\r
      <Button variant="ghost">Ghost</Button>\r
      <Button variant="danger">Danger</Button>\r
      <Button variant="glass">Glass</Button>\r
      <Button variant="premium">Premium</Button>\r
      <Button variant="success">Success</Button>\r
    </div>
}`,...(z=(N=o.parameters)==null?void 0:N.docs)==null?void 0:z.source}}};const H=["Primary","Premium","Danger","Loading","AllVariants"];export{o as AllVariants,t as Danger,n as Loading,s as Premium,r as Primary,H as __namedExportsOrder,U as default};

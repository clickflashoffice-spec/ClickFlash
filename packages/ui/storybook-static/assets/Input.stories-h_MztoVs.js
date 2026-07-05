import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as i}from"./index-DyTKwKRb.js";import{c as f}from"./clsx-B-dksMZM.js";import{t as W}from"./bundle-mjs-BZSatpsL.js";import"./_commonjsHelpers-Cpj98o6Y.js";const c=i.memo(i.forwardRef(({label:u,error:r,helperText:l,leftIcon:n,rightIcon:d,fullWidth:I=!0,variant:R="default",className:q="",id:A,required:D,...E},T)=>{const k=i.useId(),a=A||k,m=r?`${a}-error`:void 0,p=l?`${a}-helper`:void 0,S=[m,p].filter(Boolean).join(" ")||void 0,_={default:`
          bg-background text-foreground border-border
          focus:ring-primary/20 focus:border-primary
        `,glass:"glass-input"};return e.jsxs("div",{className:f("flex flex-col gap-1.5",I?"w-full":"w-auto"),children:[u&&e.jsxs("label",{htmlFor:a,className:"text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-1",children:[u,D&&e.jsx("span",{className:"text-danger",children:"*"})]}),e.jsxs("div",{className:"relative group",children:[n&&e.jsx("div",{className:"absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors",children:e.jsx("span",{className:"w-5 h-5",children:n})}),e.jsx("input",{ref:T,id:a,className:W(f("w-full px-4 py-3 rounded-xl border transition-all duration-300","focus:outline-none focus:ring-4 placeholder:text-muted-foreground/50","disabled:opacity-50 disabled:cursor-not-allowed",_[R],n&&"pl-11",d&&"pr-11",r?"border-danger focus:ring-danger/20":"border-border/60 shadow-sm",q)),"aria-invalid":r?"true":"false","aria-describedby":S,...E}),d&&e.jsx("div",{className:"absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors",children:e.jsx("span",{className:"w-5 h-5",children:d})})]}),r?e.jsx("p",{id:m,className:"text-xs font-medium text-danger animate-fadeIn",children:r}):l?e.jsx("p",{id:p,className:"text-xs text-muted-foreground",children:l}):null]})}));c.displayName="Input";c.__docgenInfo={description:"",methods:[],displayName:"Input",props:{label:{required:!1,tsType:{name:"string"},description:""},error:{required:!1,tsType:{name:"string"},description:""},helperText:{required:!1,tsType:{name:"string"},description:""},leftIcon:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},rightIcon:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},fullWidth:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}},variant:{required:!1,tsType:{name:"union",raw:"'default' | 'glass'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'glass'"}]},description:"",defaultValue:{value:"'default'",computed:!1}},className:{defaultValue:{value:"''",computed:!1},required:!1}}};const C={title:"ClickFlash/Input",component:c,tags:["autodocs"],argTypes:{label:{control:"text"},placeholder:{control:"text"},error:{control:"text"},disabled:{control:"boolean"}}},s={args:{label:"Email Address",placeholder:"photographer@studio.com"}},t={args:{label:"Album Name",placeholder:"Summer Wedding 2026",error:"Album name must be at least 3 characters",value:"AB"}},o={args:{label:"Desk ID",value:"desk_abc123xyz",disabled:!0}};var g,x,b;s.parameters={...s.parameters,docs:{...(g=s.parameters)==null?void 0:g.docs,source:{originalSource:`{
  args: {
    label: 'Email Address',
    placeholder: 'photographer@studio.com'
  }
}`,...(b=(x=s.parameters)==null?void 0:x.docs)==null?void 0:b.source}}};var h,v,y;t.parameters={...t.parameters,docs:{...(h=t.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    label: 'Album Name',
    placeholder: 'Summer Wedding 2026',
    error: 'Album name must be at least 3 characters',
    value: 'AB'
  }
}`,...(y=(v=t.parameters)==null?void 0:v.docs)==null?void 0:y.source}}};var N,j,w;o.parameters={...o.parameters,docs:{...(N=o.parameters)==null?void 0:N.docs,source:{originalSource:`{
  args: {
    label: 'Desk ID',
    value: 'desk_abc123xyz',
    disabled: true
  }
}`,...(w=(j=o.parameters)==null?void 0:j.docs)==null?void 0:w.source}}};const M=["Default","WithError","Disabled"];export{s as Default,o as Disabled,t as WithError,M as __namedExportsOrder,C as default};

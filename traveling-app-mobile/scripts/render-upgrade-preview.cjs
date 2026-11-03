// Visual fixture: actual RN Web screen components, no Supabase/Stripe calls or real customer data.
const fs=require('fs'),path=require('path'),Module=require('module'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),rn=require('react-native-web');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/upgrade-preview');fs.mkdirSync(out,{recursive:true});
const catalog=JSON.parse(fs.readFileSync(path.join(root,'../docs/media-catalog.json'),'utf8'));
const context=catalog.photos[7];
const user={id:'fixture-user',full_name:'Nguyễn Minh An',email:'an@example.test',role:'guest'};
const listing={id:context.targetId,title:'Sapa Valley Homestay',city:'Sapa',country:'Vietnam',cover_photo:context.imageUrl,photo_context:context,rating_avg:4.7,review_count:23,max_guests:2};
const quote={listingId:listing.id,title:listing.title,city:listing.city,coverPhoto:listing.cover_photo,photoContext:context,checkInDate:'2027-01-15',checkOutDate:'2027-01-17',guests:2,adults:2,children:0,maxGuests:2,currency:'USD',pricePerNight:35,totalNights:2,basePriceTotal:70,cleaningFee:5,serviceFee:5,totalPrice:80,policy:{version:'stay-v1',currency:'USD',depositAmount:30,timezone:'UTC',cancellation:'Đơn đã xác nhận chỉ được hủy trước ngày nhận phòng theo UTC. Tiền đã trả được tạo yêu cầu hoàn; cần quản trị duyệt và nhà cung cấp xác nhận.',payment:'Đặt phòng chỉ được xác nhận sau khi server kiểm tra thanh toán. Nếu trả cọc, bạn cần thanh toán phần còn lại trước khi hoàn tất chuyến đi.',hold:'Chưa thanh toán trong thời hạn giữ lịch: đơn có thể hết hạn. Báo giá chưa giữ phòng.'}};
const booking={id:'fixture-booking',booking_code:'TRV-FIXTURE',listing_id:listing.id,listing_title:listing.title,check_in_date:quote.checkInDate,check_out_date:quote.checkOutDate,number_of_guests:2,total_price:80,balance_due:80,amount_paid:0,payment_plan:'full',booking_status:'pending',payment_status:'pending',payment_due_at:new Date(Date.now()+900000).toISOString(),server_time:new Date().toISOString(),photo_context:context};
const cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file).exports;
  const mod=new Module(file,module);cache.set(file,mod);mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));
  const original=mod.require.bind(mod);
  mod.require=name=>{
    if(name==='react-native')return rn;
    if(name==='react-native-safe-area-context')return {SafeAreaView:rn.View,useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})};
    if(name==='@react-navigation/native')return {useNavigation:()=>({navigate(){},replace(){},canGoBack:()=>false}),useRoute:()=>({params:{quote,bookingId:booking.id}})};
    if(name==='@tanstack/react-query')return {useQuery:({queryKey})=>({data:queryKey[0]==='listing_detail'?listing:queryKey[0]==='payment_config'?{mode:'mock',publishableKey:null}:booking,isLoading:false,refetch:async()=>{}}),useQueryClient:()=>({invalidateQueries(){},setQueryData(){}})};
    if(name==='lucide-react-native')return new Proxy({},{get:()=>()=>null});
    if(name.endsWith('/context/AuthContext'))return {useAuth:()=>({user,isLoading:false})};
    if(name.endsWith('/services/apiClient'))return {apiClient:{}};
    if(name.endsWith('/services/bookingPayment'))return {paymentErrorMessage:e=>e.message};
    if(name.endsWith('/utils/storage'))return {storage:{}};
    if(name==='expo-crypto')return {};
    if(name.endsWith('/store/useFilterStore'))return {useFilterStore:{getState:()=>({})}};
    if(name.endsWith('/TripEditor'))return {TripEditor:()=>null};
    if(name.endsWith('/StripeCheckout'))return {StripeCheckout:()=>null};
    if(name.startsWith('.')){const base=path.resolve(path.dirname(file),name);const target=['.tsx','.ts'].map(ext=>base+ext).find(f=>fs.existsSync(f));if(target)return load(target);}
    return original(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);return mod.exports;
}
for(const name of ['OrderReview','Payment']){
  const Component=load(path.join(root,'src/screens/'+name+'Screen.tsx'))[name+'Screen'];
  rn.AppRegistry.registerComponent(name,()=>Component);
  const app=rn.AppRegistry.getApplication(name,{}),markup=renderToStaticMarkup(app.element),css=renderToStaticMarkup(app.getStyleElement());
  fs.writeFileSync(path.join(out,name+'.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} fixture</title>${css}<style>html,body,#root{height:100%;margin:0}body{font-family:system-ui}*{box-sizing:border-box}</style><div id="root">${markup}</div></html>`);
}
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="vi"><meta charset="utf-8"><title>Giai đoạn 1 — kiểm tra bố cục</title><style>body{font:14px system-ui;background:#e9f0f4;color:#172b3a;padding:16px}.row{display:flex;gap:24px;flex-wrap:wrap}iframe{border:1px solid #ccd9e0;border-radius:12px;height:844px;background:white}</style><h1>Checkout · 620px / 360px</h1><p>Fixture chỉ kiểm tra hình ảnh và bố cục, không thay thế test giao dịch tương tác.</p><div class="row"><iframe title="Checkout desktop" src="OrderReview.html" width="620"></iframe><iframe title="Checkout mobile" src="OrderReview.html" width="360"></iframe></div><h1>Thanh toán · 360px</h1><iframe title="Payment mobile" src="Payment.html" width="360"></iframe></html>`);
console.log('Rendered actual screen fixtures to dist/upgrade-preview');
if(process.argv.includes('--serve')){
  const http=require('http');http.createServer((req,res)=>{const file=path.join(out,path.basename((req.url||'/').split('?')[0])||'index.html');if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(file));}).listen(8098,'127.0.0.1',()=>console.log('Visual fixture: http://127.0.0.1:8098'));
}

const url = "https://logseal.firehomework.top/" //注意，一定要在后面加斜杠！不然拼接就出错辣！

// 借鉴BOOKMARK项目的XBSKV必须存在
if (typeof XBSKV === 'undefined') {
  addEventListener('fetch', event => {
    event.respondWith(
      new Response(
        'XBSKV is not defined, please check KV Namespace Bindings.',
        { status: 500 },
      ),
    )
  })
} else {
  addEventListener('fetch', event => {
    event.respondWith(
      handleRequest(event.request).catch(
        err => new Response(err.stack, { status: 500 }),
      ),
    )
  })
}
const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Methods': 'GET, POST, PUT',
  'Access-Control-Allow-Headers': 'Content-Type, Accept-Version',
	'Access-Control-Allow-Origin': url.slice(0,-1),
};


//拦截请求
/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
const handleRequest = async request => {
	//获取当前的路径信息
	const { pathname } = new URL(request.url)
	if (request.method === 'OPTIONS') {
    return jsonToResponse('')
  }
	//实现仿造的海豹的两个API，一个是获取，一个是上传
	//上传
	if (pathname === '/dice/api/log' && request.method==="PUT"){
		//检查文件大小是否超过2MB，若超过，则舍弃。
		const contentLength = request.headers.get('Content-Length');
		if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ success: false, message: 'File size exceeds 2MB limit' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
		//获取对应formData的属性
		var tempData = request.formData();
		//获取所有四项属性
		var name = (await tempData).get("name");
		var file = (await tempData).get("file");
		var uniform_id = (await tempData).get("uniform_id");
		//使用木落大佬提供的检验方式检验uniform_id的正确性
		var patt1=/^[^:]+:\d+$/;
		if(!patt1.test(uniform_id))
			{
				//返回未能通过的信息：uniform_id field did not pass validation
				 return new Response(JSON.stringify({"data": "uniform_id field did not pass validation"}), {headers: Object.assign({ 'Content-Type': 'application/json' }),status:400});
			}
		//使用木落大佬的检验方式检验file文件的大小
		//木落并没有提及这个的返回值是什么，俺自由发挥一下，反正也好改。
		if(file.size > 2 * 1024 * 1024){
			return new Response(JSON.stringify({"data": "Size too big!"}), {headers: Object.assign({ 'Content-Type': 'application/json' }),status:400});
		}
		//正题：研究file和最终的传值的关系
		//从https://community.cloudflare.com/t/convert-request-body-to-base64-encoded-string-solved/99341/2抄来的代码
		//得出结论：zlib压缩之后，什么都不做直接转base64，之后取的时候就以base64的方式取就行了。
		let logdata = '';
		(new Uint8Array(await file.arrayBuffer())).forEach(
				(byte) => { logdata += String.fromCharCode(byte) }
			)
		logdata = btoa(logdata);
		//随机一个key + 一个密码，之后将其拼接起来，存到KV当中。
		//密码：
		let password = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
		//key(所以我还是没搞懂，这key有啥用23333)
		let key = generateRandomString(4);
		// 第二个问题：如何使用KV存储数据~ 写await以保证肯定运行得到
		await XBSKV.put(key + "#" + password,JSON.stringify(generateStorageData(logdata,name)));
		//构建海豹染色器需要的后端
		return new Response(JSON.stringify({"url": url + "?key=" + key + "#" + password}), {
			headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
		})
	}
	//获取
	if(pathname === "/dice/api/load_data" && request.method === "GET"){
		//先读取两个属性
		const url = new URL(request.url);
		//获取真正的key
		var trulykey = url.searchParams.get("key") + "#" + url.searchParams.get("password");
		//用key取出相应的数据
		var resp = await XBSKV.get(trulykey)
		return new Response(resp, {
			headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
		})
	}
	if(pathname === "/favicon.ico"){
		return new Response(resp, {
			headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
		})
	}
	else{
		return new Response("海豹可爱吗？")
	}
}

//使用JSON返回
const jsonToResponse = json => {
  return new Response(JSON.stringify(json), {
    headers: Object.assign({ 'Content-Type': 'application/json' }, cors)
  })
}
//尝试使用FileReader转换File为base64，并观察是否一致。
//注：FileReader是浏览器端的，服务器没有这个东西。
async function fileToBase64(file) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64;
}
//从百度javascript随机字符串里抄来的随机方案
function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    const randomChar = characters.charAt(randomIndex);
    result += randomChar;
  }

  return result;
}
function generateStorageData(data,name){
		return {
			client:"SealDice",
			created_at: new Date().toISOString(),
			data:data,
			name:name,
			note:"",
			updated_at:new Date().toISOString()
		}
}

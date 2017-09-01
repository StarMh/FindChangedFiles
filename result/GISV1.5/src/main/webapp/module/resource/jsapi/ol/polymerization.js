/****
 *Polymerization
 *非业务型点聚合
 *****/
HikGIS.Util.extend(HikGIS.Polymerization, {
	STYLE_CIRCLE : "circle",
	STYLE_SQUARE : "square",
	STYLE_CROSS : "cross",
	STYLE_X : "x",
	STYLE_DIAMOND : "diamond",
	STYLE_TARGET : "target"
});

HikGIS.Polymerization = HikGIS.Class({

	//聚合点集显示的图层
	polymerizeLayer : null,

	//需要聚合的图层组
	sourceLayers : null,

	//获得源图层中的点集合
	sourcePoiset : null,

	//当前的主map
	map : null,

	//根据地图的层级分成聚合集合
	//ex: this.levelPolymerizeSet = [{"level":maplevel,value:[{"id":gra.id,value:[poigra1,poigra2...poigran]},{}...{}]},{}...{}]
	levelPolymerizeSet : [],

	//不需要聚合的缩放等级列表
	polymerLevelList : null,

	markerPicHeigth : 34,

	showPrograss : false,

	//该字段控制是否聚合单个点
	isSinglePM : true,

	normalpicUrl : './jsapi/ol/img/cluster/',

	alarmPicUrl : './jsapi/ol/img/cluster/',

	//内存表
	dataTable : null,

	//数据源坐标系 默认 EPSG:900913 可换为EPSG:4326
	srFrom : 'EPSG:900913',
	//转换后的坐标系 默认 EPSG:900913
	srTo : 'EPSG:900913',

	graphicSet : null,

	sourceGraphics : {},

	picUrlPrefix : null,

	virtualExtent : null,

	nowZoomLevel : null,

	virtualDistance : 350,
	
	generalModeHideLayers: {},
	
	ignoreType : [],
	cursor:'pointer',
	elementPolymerLevel:{},//指定类型的marker达到一定层级后才进行聚合{'observation-tower':9,'':''}(observation-tower大于9级不聚合)

	/**
	 * 聚合类初始化，绑定源图层以及聚合图层
	 * 
	 * @param {}
	 *            sourceLayer 源图层
	 * @param {}
	 *            options {
	 *					autoDistance : npx,
	 *					ignoreLevelList : [...],
	 *					NormalpicUrl : "", //正
	 *					alarmPicUrl : ""
	 *				}
	 */
	initialize : function(options){
		if(options){
			if(options.polymerLevelList){
				this.polymerLevelList = options.polymerLevelList;
			}
			if(options.normalpicUrl){
				this.normalpicUrl = options.normalpicUrl;
			}
			if(options.alarmPicUrl){
				this.alarmPicUrl = options.alarmPicUrl;
			}
			if(options.dataTable){
				this.dataTable = options.dataTable;
			}
			if(options.sourceLayers){
				this.sourceLayers = options.sourceLayers;
			}
			if(options.map){
				this.map = options.map;
			}
			if(options.graphicSet){
				this.graphicSet = options.graphicSet;
			}
			if(options.srFrom){
				this.srFrom = options.srFrom;
			}
			if(options.srTo){
				this.srTo = options.srTo;
			}
			if(options.picUrlPrefix){
				this.picUrlPrefix = options.picUrlPrefix;
			}
			if(options.virtualDistance){
				this.virtualDistance = options.virtualDistance;
			}
			if(options.ignoreType) {
				this.ignoreType = options.ignoreType;
			}
			if(options.cursor){
				this.cursor = options.cursor;
			}
			if(options.showVisibleArea){
				this.showVisibleArea = options.showVisibleArea;
			}
			if(options.mapDraw){
				this.mapDraw = options.mapDraw;
			}
			if(options.generalViewLayer) {
				this.generalViewLayer = options.generalViewLayer;
			}
			if(options.generalMode) {
				this.generalMode = options.generalMode;
			} else {
				this.generalMode = false;
			}
			if(options.enterGeneralModeCallBack) {
				this.enterGeneralModeCallBack = options.enterGeneralModeCallBack;
			}
			if(options.exitGeneralModeCallBack) {
				this.exitGeneralModeCallBack = options.exitGeneralModeCallBack;
			}
			if(options.elementPolymerLevel){
				this.elementPolymerLevel = options.elementPolymerLevel;
			}
		}
		for(key in this.sourceLayers){
			this.sourceGraphics[key] = [];
		}
		this.dataTableFormat();
		this.polymerizeLayer = new HikGIS.Layer.GraphicLayer();
		this.map.addLayer(this.polymerizeLayer);
		this.isForceRefresh = false;
		var _this = this;
		$(".general_view_detail").on("click", function(){
			$(".header",parent.document).css("display","none");
    		$("#iframe-content",parent.document).css("top","0");
    		var towerList = _this.dataTable["observation-tower"];
    		var oldList = $("#tower-info-list", parent.document);
    		if(oldList) {
    			oldList.remove();
    		}
    		var html = '<ul id="tower-info-list" towerId="'+$(this).parent().parent().attr("towerId")+'">';
    		for(var i=0;i<towerList.length;i++) {
    			if(towerList[i].thumbnailview) {
	    			html += '<li towerId="'+towerList[i].elementId+'" elementName="'+towerList[i].elementName+
	    						'" thumbnailview="'+towerList[i].thumbnailview+
	    						'" generalview="'+towerList[i].generalview+
	    						'" generalview_small="'+towerList[i].smallgeneralview+
	    						'" longitude="'+towerList[i].longitude+
	    						'" latitude="'+towerList[i].latitude+'"></li>';
    			}
    		}
    		$("body",parent.document).append(html+'</ul>');
    		$("body", parent.document).css("min-width","960px");
    		$("#iframe-content iframe",parent.document).attr("src","module/resource/generalview.jsp");
		});
		$(".general_view_refresh").on("click", function(){
			var id = $(this).parent().parent().attr("towerId");
    		top.$.msg({
    			type : 'confirm',
    			msg : '确定更新该瞭望塔全景图？<span style="line-height: 15px;">将中断该瞭望塔的巡航，拍摄期间不能被中断，<br>需要取消该瞭望塔所有OSD叠加，否则可能拼接失败</span>',
    			mask : true,
    			width : 400,
    			contentStyle : "margin-top:30px;margin-left:20px",
    			ok : function() {
	    	    	tk.ajax({
	    	    		data: {
	    	    			towerId: id,
	    	    			forceGeneral: 0
	    	    		},
	    	    		url:"generalView!generateGeneralView.action",
	    	    		success: function(data) {
	    	    			if(data==7) {
	    	    				top.$.tip('该服务器不支持全景拼接！');
	    	    			} else if(data==0) {
	    	    				top.$.tip('开始拍摄全景图，请稍后查看！');
	    	    				$("#general_view_"+id+">.general_view_content>.general_preview").remove();
	    	    				$("#general_view_"+id+">.general_view_content>.general_view_control>.general_view_detail").attr("hidden","hidden");
	    	    				$("#general_view_"+id+">.general_view_content>.general_view_none").html("正在拍摄全景图");
	    	    				$("#general_view_"+id+">.general_view_content>.general_view_control>.general_view_refresh").attr("title","正在拍摄全景图");
	    	    				// 开启更新
	    	    				clearInterval(updateGeneralInfo);
	    	    				updateGeneralInfo = setInterval("getGeneralInfo()",2000);
	    	    			} else if(data==1) {
								top.$.err('无法获取到瞭望塔编号！');
	    	    			} else if(data==2) {
								top.$.err('该瞭望塔下不存在满足条件的摄像机！');
	    	    			} else if(data==3) {
								top.$.err('该瞭望塔当前已经在执行全景图拍摄任务！');
	    	    			} else if(data==4) {
	    	    				top.$.confirm('该瞭望塔当前正在执行巡航方案，是否确定中止巡航方案并开始拍摄全景图？', function() {
		    	        	    	tk.ajax({
		    	        	    		data: {
		    	        	    			towerId: id,
		    	        	    			forceGeneral: 1
		    	        	    		},
		    	        	    		url:"generalView!generateGeneralView.action",
		    	        	    		success: function(data) {
		    	        	    			if(data==0) {
		    	        	    				top.$.tip('成功中止巡航，开始拍摄全景图，请稍后查看！');
		    	        	    				$("#general_view_"+id+">.general_view_content>.general_preview").remove();
		    	        	    				$("#general_view_"+id+">.general_view_content>.general_view_control>.general_view_detail").attr("hidden","hidden");
		    		    	    				$("#general_view_"+id+">.general_view_content>.general_view_none").html("正在拍摄全景图");
		    		    	    				$("#general_view_"+id+">.general_view_content>.general_view_control>.general_view_refresh").attr("title","正在拍摄全景图");
		    		    	    				// 开启更新
		    		    	    				clearInterval(updateGeneralInfo);
		    		    	    				updateGeneralInfo = setInterval("getGeneralInfo()",2000);
		    	        	    			} else if(data==1) {
		    	    							top.$.err('无法获取到瞭望塔编号！');
		    	        	    			} else if(data==2) {
		    	        	    				top.$.err('该瞭望塔下不存在满足条件的摄像机！');
		    	        	    			} else if(data==3) {
		    	    							top.$.err('该瞭望塔当前已经在执行全景图拍摄任务！');
		    	        	    			} else if(data==5) {
		    	    							top.$.err('无法获取该瞭望塔下摄像机的数据！请检查设备或稍后再试');
		    	        	    			} else if(data==6) {
		    	    							top.$.err('您没有拍摄全景图的权限！');
		    	        	    			} else {
		    	    							top.$.err('未知错误，请联系管理员！');
		    	        	    			}
		    	        	    		}
		    	        	    	});
		    	    			});
	    	    			} else if(data==5) {
								top.$.err('无法获取该瞭望塔下摄像机的数据！请检查设备或稍后再试');
	    	    			} else if(data==6) {
								top.$.err('您没有拍摄全景图的权限！');
	    	    			} else {
								top.$.err('未知错误，请联系管理员！');
	    	    			}
	    	    		}
	    	    	});
    			}
			});
//    		$(this).parent().parent().html("");
    	});
		$(".general_view_content").on({
			mouseenter:function(){$(this).find(".general_view_control").css("display","block")},
			mouseleave:function(){$(this).find(".general_view_control").css("display","none")}
		});
	},

	caculateVirtualExtent : function(factbounds){
		var res = this.map.getResolution();
		var ox = this.virtualDistance*res, oy = this.virtualDistance*res;
		var left = factbounds.left - ox;
		var right = factbounds.right + ox;
		var bottom = factbounds.bottom - oy;
		var top = factbounds.top + ox;
		return new HikGIS.Geometry.Extent(left,bottom,right,top);
	},

	isNeedRefresh : function(){
		var factbounds = this.map.getExtent();
		if(this.virtualExtent){						
			if(factbounds.xmin >= this.virtualExtent.xmin &&
				factbounds.ymin >= this.virtualExtent.ymin &&
				factbounds.xmax <= this.virtualExtent.xmax &&
				factbounds.ymax <= this.virtualExtent.ymax){
				if(this.nowZoomLevel != this.map.zoom){
					this.virtualExtent = this.caculateVirtualExtent(factbounds);
					this.nowZoomLevel = this.map.zoom;
					return true;
				}else{
					return false;
				}
			}else{
				this.nowZoomLevel = this.map.zoom;
				this.virtualExtent = this.caculateVirtualExtent(factbounds);
				return true;
			}			
		}else{
			this.nowZoomLevel = this.map.zoom;
			this.virtualExtent = this.caculateVirtualExtent(factbounds);
			return true;
		}
	},

	isNeedAppRefresh : function(){
		if(this.nowZoomLevel){
			if(this.nowZoomLevel != this.map.zoom){
				this.nowZoomLevel = this.map.zoom;
				return true;
			}else{
				return false;
			}
		}else{
			this.nowZoomLevel = this.map.zoom;
			return true;
		}
	},

	/**
	 * 正常加载范围内的数据
	 * 
	 * 
	**/
	dataTableFormat : function(akey){
		for(var key in this.dataTable){
			if(akey && akey != key){
				continue;
			}
			var dataSet = this.dataTable[key];
			var aTypeSet = this.graphicSet;
			var aGraSet = aTypeSet.propertySet;
			for(var i = 0, j = dataSet.length; i < j; i++){
				var adata = dataSet[i];
				var aGraphic = this.setAGraphic(aTypeSet,aGraSet,adata,key);
				this.sourceGraphics[key].push(aGraphic);
			}
		}
	},

	setAGraphic : function(aTypeSet,aGraSet,adata,key){
		var pGeo = null;
		if(aGraSet.coordMode && aGraSet.coordMode == 'NORMAL'){
			pGeo = new HikGIS.Geometry.Point(parseFloat(adata[aGraSet.xArg]),parseFloat(adata[aGraSet.yArg])).transform(this.srFrom,this.srTo);
		}else{
			pGeo = (HikGIS.Geometry.GeomFactory.fromWkt(adata[aGraSet.WKTArg])).transform(this.srFrom,this.srTo);
		}
		var textsymbol = new HikGIS.Symbol.TextSymbol(adata[aGraSet.textArg]);
		var url = null;
		if(aGraSet.picUrlMode == 'FROMDATA'){
			url = adata[aGraSet.picUrlArg];
		}else{
			url = aGraSet.picUrlArg;
		}
		if(this.picUrlPrefix){
			url = this.picUrlPrefix + url;
		}				
		adata.type = key;
		var picsymbol = new HikGIS.Symbol.PictureMarkerSymbol(url,aGraSet.width,aGraSet.height);
		var comsymbol = new HikGIS.Symbol.CompositeSymbol([textsymbol,picsymbol]);
		if(this.cursor){
			comsymbol.cursor = this.cursor;
		}
		if(adata.cursor){
			comsymbol.cursor = adata.cursor;
		}
		
		var aGraphic = new HikGIS.Graphic(pGeo,comsymbol,{id:adata[aGraSet.idArg], type:key, 
			initAngle:adata[aGraSet.initAngle], 
			fieldAngle:adata[aGraSet.fieldAngle], 
			visualRange:adata[aGraSet.visualRange],
			lastAngle:adata[aGraSet.initAngle]});
		if(aGraSet.idArg){
			aGraphic.id = adata[aGraSet.idArg];
		}
		if(this.generalViewLayer && key=="observation-tower") {
			aGraphic.thumbnailview = adata[aGraSet.thumbnailview];
			var divId = 'general_view_'+aGraphic.id;
			var lglt = new OpenLayers.LonLat(adata.longitude,adata.latitude).transform("EPSG:4326","EPSG:900913");
			var html='<div id="'+divId+'" class="general_view_wrapper"> '+
					'<div class="general_view_content" towerId="'+aGraphic.id+'"> ';
			if(aGraphic.thumbnailview) {
				html+= '<div class="general_view_none"></div><div class="general_preview"></div> <div class="general_view_control" >'+
					'<div class="general_view_detail" title="查看大图"></div>'+
					'<div class="general_view_refresh" title="重新拍摄全景图"></div></div>';
			} else {
				var message = "";
				var hover = "";
				switch (adata['existsGeneralview']) {
				case 2:
					message = "全景图拍摄失败";
					hover = "重新拍摄全景图";
					break;
				case 3:
					message = "全景图拼接失败";
					hover = "重新拍摄全景图";
					break;
				case 4:
					message = "正在拍摄全景图";
					hover = "正在拍摄全景图";
					break;
				case 5:
					message = "正在拼接全景图";
					hover = "正在拼接全景图";
					break;
				default:
					message = "无全景图";
					hover = "拍摄全景图";
					break;
				}
				html+=  '<div class="general_view_none">'+message+'</div> <div class="general_view_control" >'+
				'<div class="general_view_detail" title="查看大图" hidden="hidden"></div><div class="general_view_refresh" title="'+hover+'"></div></div>';
			}
			html += '</div></div>';
			var markerIcon = new HikGIS.HtmlIcon(html, {}, {
				x : -75,
				y : -128
			})
			var marker = new OpenLayers.Marker(lglt, markerIcon);
			this.generalViewLayer.addMarker(marker);
			if(aGraphic.thumbnailview) {
				$("#"+divId+" .general_preview").css({
					"background":"url("+aGraphic.thumbnailview+") no-repeat",
					"background-size":"160px 90px"});
			}
		}
		aGraphic.key = key;		
		aGraphic.addEventListener('click',aTypeSet.click);
		aGraphic.addEventListener('dblclick',aTypeSet.dblclick);
		if(aTypeSet.mouseOver) {
			aGraphic.addEventListener('mouseOver',aTypeSet.mouseOver);
		}
		return aGraphic;
	},

	insertData : function(key,data){
		this.dataTable[key].push(data);
		var aTypeSet = this.graphicSet;
		var aGraSet = aTypeSet.propertySet;
		var aGraphic = this.setAGraphic(aTypeSet,aGraSet,data,key);
		this.sourceGraphics[key].push(aGraphic);
	},

	deleteData : function(key,elementId){
		for(var i = 0, j = this.dataTable[key].length; i < j; i++){
			if(this.dataTable[key][i].elementId == elementId){
				OpenLayers.Util.removeItem(this.dataTable[key],this.dataTable[key][i]);
				break;
			}
		}
		for(var j = 0, i = this.sourceGraphics[key].length; j < i; j++){
			if(this.sourceGraphics[key][j].id == elementId){
				OpenLayers.Util.removeItem(this.sourceGraphics[key],this.sourceGraphics[key][j]);
				break;
			}
		}
	},

	updateData : function(key,data){
		for(var i = 0, j = this.dataTable[key].length; i < j; i++){
			if(this.dataTable[key][i].elementId == data.elementId){
				this.dataTable[key][i] = data;
				break;
			}
		}
		for(var j = 0, i = this.sourceGraphics[key].length; j < i; j++){
			if(this.sourceGraphics[key][j].id == data.elementId){
				OpenLayers.Util.removeItem(this.sourceGraphics[key],this.sourceGraphics[key][j]);
				var aTypeSet = this.graphicSet;
				var aGraSet = aTypeSet.propertySet;
				var aGraphic = this.setAGraphic(aTypeSet,aGraSet,data,key);
				this.sourceGraphics[key].push(aGraphic);
				break;
			}
		}
	},
	
	addSourceLayer : function(key, layer) {
		this.sourceLayers[key] = layer;
		this.sourceGraphics[key] = [];
		this.dataTable[key] = [];
	},
	
	removeSourceLayer : function(key) {
		if(this.sourceLayers[key]) {
			this.sourceLayers[key].clear();
			delete this.sourceLayers[key];
		}
		if(this.sourceGraphics[key]) {
			delete this.sourceGraphics[key];
		}
		if(this.dataTable[key]) {
			delete this.dataTable[key];
		}
	},
	
	updateSourceGraphic : function(key, elementId, iconPath, elementName) {
		if(this.sourceGraphics && this.sourceGraphics[key]) {
			for(var i = 0, j = this.sourceGraphics[key].length; i < j; i++) {
				if(this.sourceGraphics[key][i].id == elementId) {
					//创建样式
					//---------- v4.1 ----------------
					//var picSym = new HikGIS.Symbol.PictureMarkerSymbol(iconPath, 36, 36);
					var picSym = new HikGIS.Symbol.PictureMarkerSymbol(iconPath, 30, 30);
					//---------- v4.1 ----------------
					
					var textSym = new HikGIS.Symbol.TextSymbol(elementName);
					var cmsSymbol = new HikGIS.Symbol.CompositeSymbol([picSym, textSym]);
					this.sourceGraphics[key][i].setSymbol(cmsSymbol);
					break;
				}
			}
		}
	},
	
	updateSourceGraphicAttr : function(key, elementId, ops) {
		if(this.sourceGraphics && this.sourceGraphics[key]) {
			for(var i = 0, j = this.sourceGraphics[key].length; i < j; i++) {
				if(this.sourceGraphics[key][i].id == elementId) {
					$.extend(this.sourceGraphics[key][i].attributes, ops);
					break;
				}
			}
		}
	},

	/**
	 * 刷新转义后的graphics
	 * 
	 * @param keys
	 *            [key1,key2...]
	 * 
	**/
	refreshSourceGraphics : function(keys){
		
		for(var key in this.sourceGraphics){
			if(OpenLayers.Util.indexOf(key,keys)){
				this.sourceGraphics[key] = [];
				this.dataTableFormat(key);
			}
		}
	},

	registerMoveendToMap : function(){
		this.map.events.register("moveend", this, this.moveendRefrash);
	},

	moveendRefrash : function(){
		
		if(!this.isNeedRefresh() && !this.isNeedAppRefresh() && !this.isForceRefresh){
			return;
		}
		this.needFirstRefresh = false;
		this.isForceRefresh = false;
		// 如果配置了显示可视域，则在移动的时候清空图层中的所有可视域信息以便于更新新的信息
		if(this.showVisibleArea) {
			this.mapDraw.removeVisibleLayers();
		}
		//$(".general_view_wrapper").css("display", "none");
		var needPMPois = this.getPoisInBounds();
		this.levelPolymerizeSet = [];
		var nowlevel = this.map.getLevel();
		if(this.polymerLevelList[nowlevel.toString()] == null){
			// wangtao34添加
			this.showAllSourcePois(needPMPois);
			this.mapDraw.refreshVisibleArea();
			return;
		}
		var tempPoiSet = this.poisVacuate(needPMPois,nowlevel);	
		this.showPMPois(tempPoiSet);
		// wangtao34添加
		if(this.mapDraw){
			this.mapDraw.refreshVisibleArea();
		}
	},
	// 强制刷新
	forcedRefresh : function(){
		var needPMPois = this.getPoisInBounds();
		this.levelPolymerizeSet = [];
		var nowlevel = this.map.getLevel();
		mapDraw.refreshVisibleArea();
		if(this.polymerLevelList[nowlevel.toString()] == null){
			this.showAllSourcePois(needPMPois);
			return;
		}
		var tempPoiSet = this.poisVacuate(needPMPois,nowlevel);		
		this.showPMPois(tempPoiSet);
	},

	firstPM : function(){
		this.moveendRefrash();
	},

	getPoisInBounds : function(){
		if(!this.virtualExtent){
			this.caculateVirtualExtent(this.map.getExtent());
		}		
		var needPMPois = [];
		if(!this.map){
			return needPMPois;
		}
		if(this.generalMode) { // 全景模式只显示瞭望塔
			for(var i = 0, j = this.sourceGraphics["observation-tower"].length; i < j; i++){
				var aGraphic = this.sourceGraphics["observation-tower"][i];
				if(this.poiInBounds(aGraphic.geometry,this.virtualExtent)){
					needPMPois.push(aGraphic);
				}
				var id = aGraphic.id;
				
				
			}
		} else {
			for(var key in this.sourceGraphics){
				if(!this.sourceLayers[key]) {
					continue;
				}
				if(!this.sourceLayers[key].visible){
					continue;
				}
				for(var i = 0, j = this.sourceGraphics[key].length; i < j; i++){
					var aGraphic = this.sourceGraphics[key][i];
					if(this.poiInBounds(aGraphic.geometry,this.virtualExtent)){
						needPMPois.push(aGraphic);
					}
				}
			}
		}
		return needPMPois;
	},

	poiInBounds : function(apoint,bounds){
		if(apoint.x<bounds.xmin || apoint.x>bounds.xmax ||
			apoint.y<bounds.ymin || apoint.y>bounds.ymax){
			return false;
		}
		return true;
	},

	/**
	 * 显示所有POI
	 * 
	 */
	showAllSourcePois : function(gras){
		if(this.sourceLayers) {
			for(var key in this.sourceLayers){
				if(this.ignoreType.in_array(key))continue;
				this.sourceLayers[key].clear();
			}
			for(var i = 0, j = gras.length; i < j; i++){
				this.sourceLayers[gras[i].key].add(gras[i]);
			}
			this.polymerizeLayer.clear();
		}
	},

	/**
	 * 隐藏所有POI
	 * 
	 */
	hideAllSourcePois : function(){
		if(this.sourceLayers) {
			for(var key in this.sourceLayers){
				if(this.ignoreType.in_array(key))continue;
				this.sourceLayers[key].clear();
			}
		}
	},

	/**
	 * 切换聚合点的以及其他点的显示，及其maker
	 * 
	 */
	showPMPois : function(PMpois){
		this.hideAllSourcePois();
		this.polymerizeLayer.clear();
		var level = this.map.getLevel();	
		this.addToPMLayer(PMpois,level);
		this.hideOrShowPMLayerPois(level);
		needShowPois = null;
	},

	addToPMLayer : function(needShowPois,level){
		this.tempTowerInfo = {};
		for(var i = 0, j = needShowPois.length; i< j; i++){
			this.setPolymerizeMarker(needShowPois[i],level);
		}
		this.towerInfo = this.tempTowerInfo; // this.towerInfo用于存放瞭望塔的经纬度信息，供gis-app.js画范围使用 ———— wanghongkai
	},

	/**
	 * 在聚合图层中是否已经加载了当前等级下的聚合点？
	 * 
	 */
	haveNowLevel : function(level){
		for(var key in this.polymerizeLayer.markers){
			if(this.polymerizeLayer.markers[key].id.indexOf("Lv" + level.toString() + "_") == 0){
				return true;
			}
		}
		return false;
	},

	hideOrShowPMLayerPois : function(level){
		for(var key in this.polymerizeLayer.markers){
			//for ex: key = "Lv11_200_..."
			if(key.indexOf(level.toString()) == 2){
				this.polymerizeLayer.markers[key].show();
			}else{
				this.polymerizeLayer.markers[key].hide();
			}
		}		
	},

	/**
	 * 设置聚合图标
	 * 
	 */
	setPolymerizeMarker : function(pois,level){
		var setSize = pois.length;
		if(this.isSinglePM && setSize == 1){
			var pm = pois[0];
			this.sourceLayers[pm.key].add(pm);
			if(pm.key=="observation-tower") {
				var id = pm.id;
				// 显示全景图缩略图
				// wangtao34 删除，缩略图的加载改为在进入全景图时执行
//				if(this.generalMode) {
//					$("#general_view_"+id).css("display", "block");
//				}
				// 将可视域更新到暂存Map，显示由MapDraw存储的显示状态控制
				var geo = pm.geometry;
				if(this.towerPtzInfo) {
					var ptzInfo = this.towerPtzInfo[id];
					if(ptzInfo) {
						this.tempTowerInfo[id] = geo;
						this.mapDraw.drawSector(parseFloat(geo.x),parseFloat(geo.y),ptzInfo.distance,ptzInfo.inner_distance,ptzInfo.horizontalValue,ptzInfo.panPos,ptzInfo.otherinfo);
						this.mapDraw.drawCircle(parseFloat(geo.x),parseFloat(geo.y),ptzInfo.lookoutRadius);
					}
				}
			}
			return;			
		}
		var poi = pois[0];
		var sym = this.getPMSymbol(pois);	
		var textsymbol = new HikGIS.Symbol.TextSymbol(setSize.toString(),null,new HikGIS.RGBColor(255,255,255,1));
		//textsymbol.setOffset(0, -12);
		var pmsymbol = new HikGIS.Symbol.PolymerizationSymbol([sym,textsymbol]);
		var apoint = poi.geometry.clone();
		var graphic = new HikGIS.Graphic(apoint,pmsymbol);
		graphic.id = "Lv" + level.toString() + "_" + setSize.toString() + "_" + pois[0].id;
		graphic.PMpois = pois;
		graphic.Fmap = this.map;
		graphic.addEventListener("click",this.PMpoisClick);
		graphic.addEventListener("dblclick",this.PMpoisDbllick);
		this.polymerizeLayer.add(graphic);
	},

	/**
	 * 设置聚合图标特定点更换告警图标,或者取消告警
	 * 
	 */
	setPMpoiShowAlarm : function(agraphic){
		if(!agraphic || !agraphic.isAlarm){
			return;
		}
		var PMpoint = null;
		if(PMpoint = this.getGraphicPMpoi(agraphic)){
			var picsym = this.getPMSymbol(PMpoint.PMpois);
			PMpoint.symbol.pictureSymbol = picsym;
			PMpoint.refresh();
		}		
	},

	/**
	 * 通过一个graphic找到他被聚合的点
	 * 
	 */
	getGraphicPMpoi : function(agraphic){
		var realDis = this.translatePxDis(this.map.getLevel());
		for(var key in this.polymerizeLayer.markers){
			var dis = this.getTwoPointDistance(agraphic.geometry,this.polymerizeLayer.markers[key].geometry);
			if(dis <= realDis){
				return this.polymerizeLayer.markers[key];
			}
		}
		return null;
	},

	/**
	 * 返回聚合图标，包括告警聚合以及非告警图标
	 * 
	 */
	getPMSymbol : function(pois){
		var setSize = pois.length;
		var num = setSize.toString().length;
		var width = 32 + (num-1)*6;
		var picsymbol = null;
		for(var i = 0; i < setSize; i++){
			if(pois[i].isAlarm){
				var picurl = this.normalpicUrl + "polymer_alarm_" + num + ".png";
				return new HikGIS.Symbol.PictureMarkerSymbol(picurl,width,this.markerPicHeigth);
			}
		}
		var picurl = this.alarmPicUrl + "polymer_" + num + ".png";
		return new HikGIS.Symbol.PictureMarkerSymbol(picurl,width,this.markerPicHeigth);
	},
	
	PMpoisClick : function(evt){
		var changeBoundsForGEO = function(GEO){
			if(GEO.type != "point"){
				return;
			}
			var geobounds = GEO.getBounds();
			if(geobounds.right != geobounds.left && geobounds.bottom != geobounds.top){
				geobounds.right = geobounds.left = Math.round(GEO.x*1000000)/1000000;
				geobounds.top = geobounds.bottom = Math.round(GEO.y*10000000)/10000000;
			}
			return [geobounds.left,geobounds.bottom,geobounds.right,geobounds.top];
		};
		if(evt.PMpois[0].geometry == null){return;}
		var fbounds = changeBoundsForGEO(evt.PMpois[0].geometry);
		for(var i = 1, j = (evt.PMpois.length - 1); i < j; i++){
			if(evt.PMpois[i].geometry == null){continue;}
			var bounds = changeBoundsForGEO(evt.PMpois[i].geometry);
			if(fbounds[0]>bounds[0]){fbounds[0]=bounds[0];}
			if(fbounds[1]>bounds[1]){fbounds[1]=bounds[1];}
			if(fbounds[2]<bounds[2]){fbounds[2]=bounds[2];}
			if(fbounds[3]<bounds[3]){fbounds[3]=bounds[3];}
		}
		evt.Fmap.zoomToExtent(fbounds);
	},

	PMpoisDbllick : function(evt){
		//可继承后进行编写
		//alert(evt.PMpois.length);
	},

	/**
	 * 转换像素距离为地理距离
	 * 
	 */
	translatePxDis : function(level){
		if(this.polymerLevelList[level.toString()] != null){
			var distance = this.map.getResolutionForZoom(level) * this.polymerLevelList[level.toString()];
			return distance;
		}
		return null;		
	},

	/**
	 * 视野中所有点的集合根据地理距离聚合后，返回n个点集合
	 * 
	 * @param {}
	 *            path 未聚合点集合
	 * @param {}
	 *            distance 像素距离转换成为的实际地理距离
	 */
	poisVacuate : function(path,level) {
		var Poisets = [];
		if(path){
			var realDis = this.translatePxDis(level);
			var size = path.length;
			//增加瞭望塔要缩放到一定层级后才聚合
			var elementSet = [];
			for(var i=0;i<size;i++){
				if(this.elementPolymerLevel[path[i].key] && this.elementPolymerLevel[path[i].key] <= level){
					var towerpinSet = [];
					towerpinSet.push(path[i]);
					Poisets.push(towerpinSet);
				}else{
					elementSet.push(path[i]);
				}
			}
			var firstPoi = elementSet[0];		
			var anoPoiset = [elementSet];
			//拆解可自增的点集合二维数组anoPoiset
			for(var i = 0; i < anoPoiset.length; i++){
				var tempinSet = [];
				var tempoutSet = [];
				//拆解处理最新填入的点集合（>realDis
				for(var j = 0; j < anoPoiset[i].length; j++){
					var fx = firstPoi.geometry.x;
					var fy = firstPoi.geometry.y;
					var maxfx = fx + realDis, maxfy = fy + realDis;
					var minfx = fx - realDis, minfy = fy - realDis;
					var tempPoi = anoPoiset[i][j].geometry;
					if(tempPoi.x < maxfx && tempPoi.x > minfx && tempPoi.y < maxfy && tempPoi.y > minfy){
						var dis = this.getTwoPointDistance(anoPoiset[i][j].geometry,firstPoi.geometry);
						if(dis < realDis){
							tempinSet.push(anoPoiset[i][j]);						
						}else{
							tempoutSet.push(anoPoiset[i][j]);
						}
					}else{
						tempoutSet.push(anoPoiset[i][j]);
					}					
		 		}
		 		//在上部代码处理第一遍之后，进入getOnePMpoi内部递归循环
		 		/*var midRes = this.getOnePMpoi(firstPoi,tempoutSet,tempinSet,realDis);
				tempinSet = midRes[0];
				tempoutSet = midRes[1];*/
				if(tempinSet.length > 0 && tempinSet[0] != null){
					// var center = this.getCenterPoi(tempinSet);
					// tempinSet.push(center);
					Poisets.push(tempinSet);
					anoPoiset.push(tempoutSet);
					firstPoi = tempoutSet[0];
				}
				tempinSet = null;
				tempoutSet = null;
			}
			anoPoiset = null;
		}
		return Poisets;
	},

	//超出计算限制，坐标值过长
	getOnePMpoi : function(firstPoi,sourcePois,inSet,realDis){
		var outSet = [];
		var judgeSet = [];
		for(var i = 0, j = sourcePois.length; i < j; i++){
			var dis = this.getTwoPointDistance(sourcePois[i].geometry,firstPoi.geometry);
			if(dis < realDis){
				inSet.push(sourcePois[i]);
				judgeSet.push(sourcePois[i]);		
			}else{
				outSet.push(sourcePois[i]);
			}
		}
		var center = this.getCenterPoi(inSet);
		if(this.isStopCircle(realDis,center,inSet) || judgeSet.length == 0){
			inSet.push(center);
			return [inSet,outSet];
		}else{
			this.getOnePMpoi(center,outSet,inSet,realDis);
		}
	},

	/**
	 * 获取一个点集的中点
	 */
	getCenterPoi : function(gras){
		if(gras.length == 0){
			return null;
		}
		var avgx = 0, avgy = 0;
		for(var i = 0, j = gras.length; i < j; i++){
			avgx = avgx + gras[i].geometry.x / gras.length;
			avgy = avgy + gras[i].geometry.y / gras.length;		
		}
		return {"geometry" : {"x" : avgx, "y" : avgy}};
	},

	/**
	 * 判断是否初始点超出范围
	 */
	isStopCircle : function(realdis,poi,poiset){
		if(poiset.length == 0){
			return null;
		}
		if(poiset.length == 1){
			return true;
		}
		var dis = 0;
		for(var i = 0, j = poiset.length; i < j; i++){
			dis = this.getTwoPointDistance(poi.geometry,poiset[i].geometry);
			if(dis>=realdis){
				return true;
			}
		}
		return false;
	},

	/**
	 * 求点到一条线段的距离
	 * 
	 * @param {}
	 *            point 点
	 * @param {}
	 *            linePoint1 线的坐标1
	 * @param {}
	 *            linePoint2 线的坐标2
	 */
	getPointToOneLineDistance : function(point, linePoint1, linePoint2) {
		var a = linePoint2.y - linePoint1.y;
		var b = linePoint1.x - linePoint2.x;
		var c = -(a * linePoint2.x + b * linePoint2.y);
		var distance = Math.abs(a * point.x + b * point.y + c) / Math.sqrt(a * a + b * b);
		distance = Math.min(distance, getTwoPointDistance(point, linePoint1));
		distance = Math.min(distance, getTwoPointDistance(point, linePoint2));
		return distance;
	},

	/**
	 * 得到两点距离
	 * 
	 * @param {}
	 *            point1 点1
	 * @param {}
	 *            point2 点2
	 */ 
	getTwoPointDistance : function(point1, point2){
		var x = point1.x - point2.x;
		var y = point1.y - point2.y;
		return Math.sqrt(x * x + y * y);
	},

	/**
	 * 摧毁本对象
	 * 
	 * @param {}
	 *            no param
	 * 
	 */
	destroy : function(){
		this.polymerizeLayer.clear();
	 	for(var key in this.sourceLayers){
	 		if(this.sourceLayers[key]) {
	 			this.sourceLayers[key].clear();
	 			delete this.sourceLayers[key];
	 		}
	 	}
	 	this.map.removeLayer(this.polymerizeLayer);
	 	if(this.map.events) {
	 		this.map.events.unregister("moveend", this, this.moveendRefrash);
	 	}
	 	this.dataTable = null;
	 	this.sourceGraphics = null;
		this.virtualExtent = null;
		this.nowZoomLevel = null;
		this.sourceLayers = null;
		this.polymerizeLayer = null;
		this.graphicSet = null;
	},

	/**
	 * wanghongkai 
	 * 更新瞭望塔的角度信息
	 */
	updateTowerPtz: function(towerPtzInfo){
		this.towerPtzInfo = towerPtzInfo;
	},
	/**
	 * wanghongkai
	 * 返回瞭望塔的位置信息
	 */
	getTowerInfo: function(){
		return this.towerInfo;
	},
	/**
	 * wanghongkai
	 * 开启全景模式
	 */
	toggleGeneralMode: function(isOn) {
		this.isForceRefresh = isOn;
		this.generalMode=isOn;
		if(isOn) {
			if(this.enterGeneralModeCallBack) {
				this.enterGeneralModeCallBack();
			}
		} else if(this.exitGeneralModeCallBack) {
			this.exitGeneralModeCallBack();
		}
	},
	
	CLASS_NAME: "HikGIS.Polymerization"

});
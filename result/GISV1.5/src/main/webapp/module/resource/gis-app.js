var appMap = null;
var alarmGraphicLayer=  null;
var generalViewLayer = null;
var moveGraphics = {};
var mapGraphic={};
var zoomWidget =null;
var curAlarmMaxCount = 500;
var alarmEventLayer = null;
var globalMapType = "normal"; // 地图类型，卫星地图；全景模式；二维地图
var moveElementType=[2001,2003];//移动设备
var fireLayer = null;
var moveGraphicLayer = {};
var mobileSourceData;
var searchLayer = null;
var pathLayer = null;
var pathPointLayer = null;
var generalMode = false;
var pathLineTool = null;
var queryGraphicMarker = null;
var fireIconArray = {};
var currentFireEventId = null;
var runtimeLength = 0;
var cruiseStatus = 0;//0正在巡航，1已停止巡航
var alarmLineArray = {};
var fireMarkerArray = {};
var kms=null;
var resourceData=null;

document.write('<script src="MapCorrect.js"></script>');
var lineStyle={
	strokeWidth : 2,
	strokeOpacity : 1,
	strokeColor : "yellow",
	graphicZIndex : 5
};
function rePolymerize() {
	polymerize.forcedRefresh();
}
//告警画图工具
var eventDrawTools = null;
//实时告警画图工具
var cEventDrawTools = null;
var polymerize=null;
var hasForceRefreshed = false;
var mapDraw = null;
var pathLineLayer = null;
var arrowDialog;

$(function() {
	
	
	loader.show("正在加载地图");
	var $target = $("#specifyMapType",parent.document);
	needMapType = $target.attr("map-type");
	$target.attr("map-type","satellite");
	initExtent(initExtentCallback);
	zoomWidget = new ZoomWidget(appMap,{
				zoomIn:'.map_control.zoom_btn[data=zoomIn]',
				zoomOut:'.map_control.zoom_btn[data=zoomOut]',
				zoomHome:'.map_control.zoom_btn[data=zoomHome]'}, {}).init();
	
	loader.hide();
	graphicLayers = {};
	mapDraw = new MapDraw({map:appMap});
	generalViewLayer = new OpenLayers.Layer.Markers('general-view-layer');
	appMap.addLayer(generalViewLayer);
	initGraphicLayer(appMap,initGraphic);
	//监听鼠标点击
	$(document.body).click(function(event){
		//工具
		if ($(event.srcElement).isChildOrSelfOf($(".fire-map-toolbar")) && !$(event.srcElement).isChildOrSelfOf($(".tool"))) {
			$('.fire-map-toolbar .tool').removeClass('tool-active');
			$('.tool-div').hide();
		}
		 //图层
		if (!$(event.srcElement).isChildOrSelfOf($(".layer-control")) && !$(event.srcElement).isChildOrSelfOf($(".map-layer-div")) ) {
			$('.map-layer-div').hide();
			$('.fire-map-toolbar .layer-control').removeClass('layer-control-active');
		}
		 //可视域
		if (!$(event.srcElement).isChildOrSelfOf($(".visiable")) && !$(event.srcElement).isChildOrSelfOf($(".visiable-layer-div")) ) {
			$('.visiable-layer-div').hide();
			$('.fire-map-toolbar .visiable').removeClass('visiable-active');
			if(mapDraw.isShowVisibleArea()){
				$('.fire-map-toolbar .visiable').addClass('visiable-open');
			}else{
				$('.fire-map-toolbar .visiable').removeClass('visiable-open');
			}
		}
		 
		if($(event.srcElement).isChildOrSelfOf($(".fire-map-toolbar"))){
			event.stopPropagation();
		}
		if ($(event.srcElement).isChildOrSelfOf($(".fire-map-toolbar")) && ($(event.srcElement).isChildOrSelfOf($(".tool")) || $(event.srcElement).isChildOrSelfOf($(".layer-control"))|| $(event.srcElement).isChildOrSelfOf($(".visiable")))) {
			$("#alarm-result").hide();
			showAlarm = false;
		}
		if ($(event.srcElement).isChildOrSelfOf($(".map-pager")) && !$(event.srcElement).isChildOrSelfOf($("#mapContainer")) && !$(event.srcElement).isChildOrSelfOf($(".tool-div"))) {
			stopMeasure();
		}
	});
	//城市选择器
	citySelector.cityInit("set-map-center");
	//图层选框内容加载
	tk.dataDic('map-resource', function(response) {
		if(response){
			var html = '<input class="layer-check ny-checkbox" id="ny-checkbox0" type="checkbox" checked data-type="all" ><label for="ny-checkbox0">全部</label><br>';
			for(var i=0;i<response.length;i++){
				html+='<input class="layer-check ny-checkbox"  type="checkbox" id="ny-checkbox-'+response[i].code+'" checked data-type="'+response[i].code+'"><label for="ny-checkbox-'+response[i].code+'">'+response[i].name+'</label><br>';
			}
			html+='<input class="layer-check ny-checkbox" id="ny-checkbox-2001" type="checkbox" checked data-type="2001"><label for="ny-checkbox-2001">护林员</label><br>';
			html+='<input class="layer-check ny-checkbox" id="ny-checkbox-2003" type="checkbox" checked data-type="2003"><label for="ny-checkbox-2003">无人机</label><br>';
			$('.map-layer-div').html(html);
			$('.layer-check').click(function(){
				var dataType = $(this).attr('data-type');
				var isChecked = $(this).is(':checked');
				if(dataType=='all'){
					if(isChecked){
						$('.layer-check').prop({checked:true});
						$('.layer-check[data-type!="all"]').each(function(){
							if(graphicLayers[$(this).attr('data-type')]){
								graphicLayers[$(this).attr('data-type')].show();								
							}
						});
						moveGraphicLayer['2001'].show();
						moveGraphicLayer['2003'].show();
						searchLayer.setVisibility(true);
					}else{
						$('.layer-check').prop({checked:false});
						$('.layer-check[data-type!="all"]').each(function(){
							if(graphicLayers[$(this).attr('data-type')]){
								graphicLayers[$(this).attr('data-type')].hide();								
							}
						});		
						moveGraphicLayer['2001'].hide();
						moveGraphicLayer['2003'].hide();
						searchLayer.setVisibility(false);
					}
				}else{
					if(isChecked){
						if(moveGraphicLayer[dataType]){
							moveGraphicLayer[dataType].show();							
						}
						if(graphicLayers[dataType]){
							graphicLayers[dataType].show();							
						}
						if((queryGraphicMarker == 'tower' && dataType == 'observation-tower') || (queryGraphicMarker == 'aircraft' && dataType == '2003') || (queryGraphicMarker == 'person'  && dataType == '2001')){
							searchLayer.setVisibility(true);
						}
					}else{
						if(moveGraphicLayer[dataType]){
							moveGraphicLayer[dataType].hide();							
						}
						if(graphicLayers[dataType]){
							graphicLayers[dataType].hide();							
						}
						if((queryGraphicMarker == 'tower' && dataType == 'observation-tower') || (queryGraphicMarker == 'aircraft' && dataType == '2003') || (queryGraphicMarker == 'person'  && dataType == '2001')){
							searchLayer.setVisibility(false);
						}
					}
					var isAllChecked = true;
					$('.layer-check[data-type!="all"]').each(function(){
						if(!$(this).is(':checked')){
							isAllChecked =false;
						}
					});
					
					if(isAllChecked){
						$('.layer-check[data-type="all"]').prop({checked:true});
					}else{
						$('.layer-check[data-type="all"]').prop({checked:false});
					}
					
					
				}
				rePolymerize();
			});
		}
	});
	// 可视域显示
//	tk.ajax(
//		{
//		url:path+"/map!getResources.action",
//		data:{
//				//currentTime: new Date()
//		},
//		succ:function(data){
//			if(data['observation-tower']){
//				var html = '<input class="ob-check ny-checkbox" id="ny-checkbox-all" type="checkbox" checked data-type="all" ><label for="ny-checkbox-all"><span class="visiable-span">全部<span></label><br>';
//				for(var i=0;i<data['observation-tower'].length;i++){
//					var id = data['observation-tower'][i].elementId;
//					var name = data['observation-tower'][i].elementName;
//					mapDraw.doShowVisibleArea(id);
//					html+='<input class="ob-check ny-checkbox"  type="checkbox" id="ny-checkbox-'+id+'" checked data-type="'+id+'"><label for="ny-checkbox-'+id+'" title="'+name+'"><span class="visiable-span">'+name+'</span></label><br>';
//				}
//				$('.visiable-layer-div').html(html);
//				var height = (data['observation-tower'].length+1) * 25+5;
//				if(height<280){
//					$('.visiable-layer-div').css('height', height+'px');
//				}
//				
//				
//				
//				$('.ob-check').click(function(){
//					var dataType = $(this).attr('data-type');
//					var isChecked = $(this).is(':checked');
//					if(dataType=='all'){
//						if(isChecked){
//							// 显示全部
//							$('.ob-check').prop({checked:true});
//							mapDraw.doShowAllVisibleArea();
//							if(generalMode){
//								for(var i=0;i<mapDraw.showVisibleAreaMap.keys.length;i++){
//									var key = mapDraw.showVisibleAreaMap.keys[i];
//									$("#general_view_"+key).css("display", "block");
//								}
//							}
//						}else{
//							// 隐藏全部
//							$('.ob-check').prop({checked:false});
//							mapDraw.doHideAllVisibleArea();
//							if(generalMode){
//								for(var i=0;i<mapDraw.showVisibleAreaMap.keys.length;i++){
//									var key = mapDraw.showVisibleAreaMap.keys[i];
//									$("#general_view_"+key).css("display", "none");
//								}
//							}
//						}
//					}else{
//						if(isChecked){
//							//显示
//							mapDraw.doShowVisibleArea(dataType);
//							if(generalMode){
//								$("#general_view_"+dataType).css("display", "block");
//							}
//						}else{
//							//隐藏
//							mapDraw.doHideVisibleArea(dataType);
//							if(generalMode){
//								$("#general_view_"+dataType).css("display", "none");
//							}
//						}
//						var isAllChecked = true;
//						$('.ob-check[data-type!="all"]').each(function(){
//							if(!$(this).is(':checked')){
//								isAllChecked =false;
//							}
//						});
//						
//						if(isAllChecked){
//							$('.ob-check[data-type="all"]').prop({checked:true});
//						}else{
//							$('.ob-check[data-type="all"]').prop({checked:false});
//						}
//					}
//					//rePolymerize();
//				});
//			}
//		}
//	});
	// 增加的每次进入时显示近期没看过的报警信息  需求里面暂时没有这个要求，所以直接注释
//	tk.ajax({
//		url:'alarmEvent!getCurrentAlarm.action',
//		succ:function(result){
//			var alarmList = result.alarmList;
//			$.each(alarmList, function(index, alarm){
//				
//				alarmListener(alarm, "currentAlarm");
//				
//				if(tk.isIE()){
//			
//					var alarmNode=document.getElementById('embed_player');
//					alarmNode.Play();
//				}else{
//					var alarmNode=document.getElementById('audio_player');
//					alarmNode.play();
//				}
//			})
//		}
//	});
	setTimeout(function(){
			tk.ajax({
	    	url:'alarmEvent!getAlarmInfoMaps.action',
	    	data:{},
	    	succ:function(data){
	    		if(data){
	    			if(!data.result){
	    				return;
	    			}
	    			var i;
	    			if(data.list.length>100){
	    				i=99;
	    			}else{
	    				i=data.list.length-1;
	    			}
	    			for(;i>=0;i--){
	    				var textContent = data.list[i];
	    				if(textContent){
	    					alarmListener(textContent,"currentAlarm");
	    				}
	    			}
	    		}
	    	}
	    });
	},100);
	var readyToGetPtz = function (){
		tk.ajax({
			url:'alarmEvent!readyToGetPtz.action',
			succ:function(result){
			}
		});
	}
	
	readyToGetPtz();
	// 每25分钟通知一次后台发送位置信息
	setInterval(readyToGetPtz,25*60*1000); // setInterval ie8下面只能这么写，不能加括号，所以得在上面加一个第一次调用
	// 如果是下面这种写法，function应该以函数的方式定义，而不是变量的方式，不然不会执行
	// 加了引号，会在时间之后执行，不加引号，则会立即执行一次
//	setInterval("readyToGetPtz()",5000);
	var $toggle = $("#enableSimulation");
	$toggle.click(function (e){
		mapDraw.toggleEnableControl($toggle);
	});
	var $drawControl = $("#drawControl");
	$drawControl.click(function (e){
		mapDraw.toggleControl($drawControl,"draw");
	});
	var $dragControl = $("#dragControl");
	$dragControl.click(function (e){
		mapDraw.toggleControl($dragControl,"drag");
	});
	$("#clear").click(function(e){
		mapDraw.clearCoverageArea();
	});

	org.activemq.Amq.init({
		uri:path+'/web/module/amq',
		logging:true,
		timeout:20,
		clientId : (new Date()).getTime().toString()
	});
	org.activemq.Amq.addListener('alarmListener', 'topic://gis-alarmdata', function(msg) {
		var textContent = msg.text || msg.textContent;
		if (textContent) {
			setTimeout(function(){
				alarmListener(textContent.toJson());
			},100);
		}
	});
	org.activemq.Amq.addListener('statusListener', 'topic://gis-alarmdata-status', function(msg) {
		var textContent = msg.text || msg.textContent;
		if (textContent) {
			removeAlarmForUpdateStatus(textContent.toJson());
		}
	});
	// 监听监控点位置改变的信息，
	org.activemq.Amq.addListener('positionListener', 'topic://gis-towerptz', function(msg) {
		//wangtao34删除，即使不显示任何一个可视域也把数据更新到后台，保证显示的一瞬间得到的是监听周期内最新的结果
//		if(mapDraw.isShowVisibleArea()) {
			var towerPtzInfo = (msg.text || msg.textContent).toJson();
			if(polymerize){
				polymerize.updateTowerPtz(towerPtzInfo); // towerPtzInfo存放瞭望塔的角度信息，供polymerization.js聚合变换时使用
				// 第一次进入页面，需要强制刷新，不然可视域不会显示
				if(!hasForceRefreshed) {
					polymerize.forcedRefresh();
					//polymerize.refreshSourceGraphics();
					towerInfo = polymerize.getTowerInfo();
					mapDraw.removeVisibleLayers();
					for(var key in towerInfo) {
						// wangtao34删除，即使不显示该可视域，也把当前状态更新给后台
						//if(mapDraw.isShowVisibleAreaMap(key)){
							var geo = towerInfo[key];
							var ptzInfo = towerPtzInfo[key];
							// 内部逻辑：如果显示，就更新显示效果，如果不显示，只更新暂存在Map内的数据
							mapDraw.drawCircle(key,parseFloat(geo.x),parseFloat(geo.y),ptzInfo.lookoutRadius);
							mapDraw.drawSector(key,parseFloat(geo.x),parseFloat(geo.y),ptzInfo.distance,ptzInfo.inner_distance,ptzInfo.horizontalValue,ptzInfo.panPos,ptzInfo.otherinfo);
						//}
					}
				}
			}
//		} else {
			// 显示控制不由监听器控制，完全可以删除
//			mapDraw.removeVisibleLayers();
//		}
	});
	
	org.activemq.Amq.addListener('gpsDataListener', 'topic://gis-web-ffpms-gpsdata', function(msg) {
		var textContent = msg.text || msg.textContent;
		if (textContent) {
			textContent = textContent.toJson();
			if (textContent) {
				try {
					setGpsData(textContent);
				} catch(e){}
			}
		}
	});
	org.activemq.Amq.addListener('notifyListener', 'topic://gis-web-ffpms-notifyData', function(msg) {
		var textContent = msg.text || msg.textContent;
		if (textContent) {
			textContent = textContent.toJson();
			if (textContent) {
				try {
					sendNotify(textContent);
				} catch(e){}
			}
		}
	});
	
	if(tk.isIE()){
		var html = '<embed id="embed_player" ';
		html+='src="../../common/themes/base/sounds/alarm.wav"';
		html+=' width="0"';
		html+=' height="0"';
		html+=' loop="false"';
		html+=' autostart="false"';
		html+='</embed>';
		$(document.body).append(html);
	}else{
		var html = '<audio controls="controls" id="audio_player" style="height:0;width:0;display:none;">';
		html+='<source src="../../common/themes/base/sounds/alarm.wav" >';
		html+='</audio>';
		$(document.body).append(html);
	}
	
   
	
	$("#alarm-center").click(function(){
//		if(!$(".cur-alarm-info").is(":hidden")){
//			$(".cur-alarm-info").hide();
//		}else{
		//$("#alarm-tips").hide();
		//$("#alarm-tips").attr("num","0");
		showCurrentAlarm();
//		}
	});
	
	$("#cur-alarm-close").click(function(){
		$(".cur-alarm-info").hide();
	});
	
	$(".cur-alarm-list").delegate('.alarm-card-div .img_icon','click',function(event){				
			event.stopPropagation();
			if(kms == null){
				initKms();
			}
/*			showFire($(this).parent().parent().parent().parent(),true);
			showAlarmPicture($(this));*/
			dealAlarmByPicture($(this));
	});
	$(".cur-alarm-list").delegate('.cur-alarm-card','click',function(event){
		event.stopPropagation();
		showFire($(this),true);
	});

	/**
	 * 图片模式处理告警
	 */
	function dealAlarmByPicture($this){
		var searchEmergencyDlg = top.$.dialog({
			title : '图片查看',
			height : 600,
			width : 700,
			foothide: true,
			url : path+'/module/resource/dealAlarmByPicture.jsp',
			afterClose:function(){

	        },
			load:function(options){
				this.showPic(kms,alarmDatas,alarmDataTypes,imgFlags,$this.attr("imgId"));
	        }
	    });	
	
	}	

	/**
	 * 显示火点图标
	 */
	function showFire($this,location){
		$('.deal').hide();
		$('.cur-alarm-card').find('.currentButton').hide();
		$this.find('.currentButton').show();

		$('.cur-alarm-card').removeClass('active');
		$this.addClass('active');
		var $locationInfo  =$this.find('.alarm-location-info');
		var $name  =$this.find('.alarm-name-info');
		var title = $name.attr("title");
		var eventLogId = $this.attr("id");
		if(eventLogId == currentFireEventId){
			return;
		}
		var longitude= $locationInfo.attr("longitude");
		var latitude = $locationInfo.attr("latitude");
		var indexCode=$locationInfo.attr("indexCode");
		var isShow = $locationInfo.attr("isShow");
		var clongitude= $locationInfo.attr("clongitude");
		var clatitude = $locationInfo.attr("clatitude");
		if(isEmpty(longitude) || isEmpty(latitude)){
			return;
		}
		var mapcorrect = new MapEPointCorrect();
		var latlong = mapcorrect.encode(parseFloat(longitude),parseFloat(latitude));
		longitude = latlong.b;
		latitude = latlong.a;
		var point = new HikGIS.Geometry.Point(parseFloat(longitude), parseFloat(latitude)).transform("EPSG:4326", "EPSG:900913");
		$(".general_alarm_content").remove();
		$this.find(".alarm-card-div .img_icon").attr("isShow","false");
		$this.find(".alarm-card-div .video_icon").attr("isShow","false");
		var originalIcon  = fireIconArray[currentFireEventId]
		if(!isEmpty(originalIcon)){
			originalIcon.setUrl("../../common/themes/base/alarms/alarm-fire.png");
		}
		if(currentFireEventId == null){
			alarmEventLayer.clearMarkers();
			eventDrawTools.layer.removeAllFeatures();
		}
		currentFireEventId = eventLogId;
		if("false"==isShow) {
			$locationInfo.attr("isShow","true");
			var size = new OpenLayers.Size(25,38);
			var offset = new OpenLayers.Pixel(-(size.w/2), -20);
			var icon = new OpenLayers.Icon("../../common/themes/base/alarms/alarm-fire-select.png", size, offset);
			var lonlat = new OpenLayers.LonLat(longitude, latitude).transform("EPSG:4326","EPSG:900913");
			var marker = new OpenLayers.Marker(lonlat, icon);
			alarmGraphicLayer.addMarker(marker);
			fireMarkerArray[eventLogId] = marker;
			icon.imageDiv.style.cursor = "pointer";
			icon.imageDiv.eventLogId=eventLogId;
			marker.events.register("click", alarmGraphicLayer, function(evt){
				if(!appMap.isMeasure()){
					if(isEmpty($("#"+eventLogId).find(".alarm-card-div .img_icon").html())){
						$("#"+eventLogId).click();
					}else{
						$("#"+eventLogId).find(".alarm-card-div .img_icon").click();
					}
					var preOffset = $(".cur-alarm-list").scrollTop() + parseInt($("#"+eventLogId).position().top);
					$(".cur-alarm-list").animate({scrollTop:preOffset},1000)
				}
				
			});
			fireIconArray[eventLogId] = icon;
			if(!isEmpty(clongitude) && !isEmpty(clatitude)){
				var clatlong = mapcorrect.encode(parseFloat(clongitude),parseFloat(clatitude));
				cEventDrawTools.drawLine([{
    				longitude:longitude,
    				latitude:latitude
    			},{
    				longitude:clatlong.b,
    				latitude:clatlong.a
    			}],eventLogId);
			}
		}else{
			var icon = fireIconArray[eventLogId];
			if(!isEmpty(icon)){
				icon.setUrl("../../common/themes/base/alarms/alarm-fire-select.png");
			}
			
		}
		if(location){
			appMap.centerAt(point);
		}
	}
	
	/**
	 * 显示告警图片
	 */
	function showAlarmPicture($this){
		var isShow = $this.attr("isShow");
		if("false" == isShow){
			var $locationInfo = $this.parent().parent().find('.alarm-location-info');
			var $name  =$this.parent().find('.alarm-name-info');
			var title = $name.attr("title");
			var eventLogId = $this.parent().parent().parent().parent().attr("id");
			var longitude= $locationInfo.attr("longitude");
			var latitude = $locationInfo.attr("latitude");
			var indexCode=$locationInfo.attr("indexCode");
			var imgUrl = $this.attr("imgUrls");
			if(isEmpty(imgUrl)){
				return;
			}
			$(".general_alarm_content").remove();
			if(imgUrl.endWith(";")){
				imgUrl = imgUrl.substring(0,imgUrl.length-1);
			}
			var imgUrls = imgUrl.split(";");
			for(var i=0;i<imgUrls.length;i++){
				imgUrls[i] = kms+imgUrls[i];
			}
			var mapcorrect = new MapEPointCorrect();
			var latlong = mapcorrect.encode(parseFloat(longitude),parseFloat(latitude));
			longitude = latlong.b;
			latitude = latlong.a;
			var lglt = new OpenLayers.LonLat(parseFloat(longitude),parseFloat(latitude)).transform("EPSG:4326","EPSG:900913");
			var html='<div class="general_alarm_content">';
			html+= '<div class="general_alarm_title"><span style="color:#000;max-width:500px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;" title='+title+'>'+title+'</span><a class="img_close" style="position: absolute;right: 1px;"></a></div>';
			html+= '<div class="general_alarm_preview"></div> <div class="" ><button class="previewButtonInImg" >实时预览</button>';
			if(imgUrls.length>1){
				html+= '<div class="alarm_picture_left"></div>'+
				'<div class="alarm_picture_right"></div>';
			}
			html += '</div></div>';
			var markerIcon = new HikGIS.HtmlIcon(html, {},{
				x : -305,
				y : -420
			});
			var marker = new OpenLayers.Marker(lglt, markerIcon);
			alarmEventLayer.addMarker(marker);
			nowCount = 0;
			$(".general_alarm_content").parent().parent().css('z-index','99999');
			$(".general_alarm_content .general_alarm_preview").css({
					"background":"url('"+imgUrls[nowCount]+"') no-repeat",
					"background-size":"cover",
					"filter":"progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+imgUrls[nowCount]+"',sizingMethod='scale')"});
			$this.attr("isShow","true");
			
			$(".img_close").click(function(){
				
				$(".general_alarm_content").remove();
				$this.attr("isShow","false");
			});
			
			
			
			$(".general_alarm_content").dblclick(function(event){
				 event.stopPropagation();
			 });
			$('.alarm_picture_right').click(function(){
				for(var i=0;i<imgUrls.length-1;i++){
					if(nowCount==i){
						nowCount+=1;
						$(".general_alarm_content .general_alarm_preview").css({
							"background":"url('"+imgUrls[nowCount]+"') no-repeat",
							"background-size":"cover",
							"filter":"progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+imgUrls[nowCount]+"',sizingMethod='scale')"});
						break;
					}
				}
			});
			$('.alarm_picture_left').click(function(){
				for(var i=imgUrls.length-1;i>0;i--){
					if(nowCount==i){
						nowCount-=1;
						$(".general_alarm_content .general_alarm_preview").css({
							"background":"url('"+imgUrls[nowCount]+"') no-repeat",
							"background-size":"cover",
							"filter":"progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+imgUrls[nowCount]+"',sizingMethod='scale')"});
						break;
					}
				}
			});
			$('.previewButtonInImg').click(function(){
				tk.ajax({
					url : 'alarmEvent!getAlarmData.action',
					data : {
						eventLogId : eventLogId
					},
					succ : function(data) {
						showRealtimeVedio(data.eventLog,"historyAlarm");
					}
				});
			});
			
		}
	}
	
	
//	$(".cur-alarm-list").delegate('.cur-alarm-card','mouseover',function(){
//		$(this).find('.alarm-border').addClass('alarm-border-hover');
//	});
//	$(".cur-alarm-list").delegate('.cur-alarm-card','mouseout',function(){
//		$(this).find('.alarm-border').removeClass('alarm-border-hover');
//	});
	$mapSwitchers = $("#mapSwitchers");
	$mapSwitchers.on({
		mouseenter:function(){
			$mapSwitchers.stop().animate({width:'212px'});
			$mapSwitchers.find("#mapSwitcherGeneral").stop().animate({left:'72px'});
			$mapSwitchers.find("#mapSwitcherNormal").stop().animate({left:'144px'});
		},
		mouseleave:function(){
			$mapSwitchers.stop().animate({width:'68px'});
			$mapSwitchers.find("#mapSwitcherGeneral").stop().animate({left:'0px'});
			$mapSwitchers.find("#mapSwitcherNormal").stop().animate({left:'0px'});
		}
	});
	
	$(".map_switcher").on("click",function(){
		var mapType = $(this).attr("maptype");
		mapSwitch(mapType);
	});
	
	$('.switch_road').on("click",function(){
		switchRoad();
	});
	
	$("#general-refresh-all").on("click",function(){
		top.$.msg({
			type : 'confirm',
			msg : '确定更新全部瞭望塔的全景图？<br><span style="line-height: 15px;">将中断所有瞭望塔的巡航，拍摄期间不能被中断，<br>需要取消该瞭望塔所有OSD叠加，否则可能拼接失败</span>', 
			mask : true,
			width : 400,
			contentStyle : "margin-top:30px;margin-left:60px",
			ok: function() {
		    	tk.ajax({
		    		url:"generalView!generateAllGeneralView.action",
		    		success: function(data) {
    	    			if(data==7) {
    	    				top.$.tip('该服务器不支持全景拼接！');
    	    			} else if(data==0) {
							top.$.err('不存在符合条件的瞭望塔，无法更新全景图！');
		    			} else if(data==1) {
		    				top.$.tip('当前所有瞭望塔都在更新全景图，请耐心等待！');
		    			} else if(data==2) {
		    				top.$.tip('开始更新所有满足条件的瞭望塔的全景图，请稍后查看！');
		    				// 开启更新
    	    				clearInterval(updateGeneralInfo);
    	    				updateGeneralInfo = setInterval("getGeneralInfo()",2000);
		    			} else if(data==6) {
							top.$.err('您没有拍摄全景图的权限！');
		    			} else {
							top.$.err('未知错误，请联系管理员！');
		    			}
		    		}
		    	});
			}
		});
	});
	
	$('.fire-map-toolbar .clear-layer').click(function(){
		alarmEventLayer.clearMarkers();
		
		alarmGraphicLayer.clearMarkers();
		eventDrawTools.layer.removeAllFeatures();
		cEventDrawTools.layer.removeAllFeatures();
		$('.alarm-location-info').attr('isShow','false');
		$('.img_icon').attr('isShow','false');
		$('.video_icon').attr('isShow','false');
		fireIconArray={};
		fireMarkerArray={};
		alarmLineArray={};
		currentFireEventId = null;
		measureClearAll();
	});
	$('.fire-map-toolbar .tool').click(function(){
		if(globalMapType != "general"){
			if($('.fire-map-toolbar .tool').hasClass('tool-active')){
				$('.fire-map-toolbar .tool').removeClass('tool-active')
			}else{
				$('.fire-map-toolbar .tool').addClass('tool-active');
			}
			$('.tool-div').toggle();
		}
	});
	
	$('.tool-div .measureLength').click(function(){
		if(globalMapType != "general"){
				measureLength();
		}
	});
	
	$('.tool-div .measureArea').click(function(){
		if(globalMapType != "general"){
				measureArea();
		}
	});
	
	$('.tool-div .geoPlot').click(function(){
		if(globalMapType != "general"){
			$('.geoPlot-div').toggle();
			$('.tool-div').toggle();
		}
	});
	
	$('.fire-map-toolbar .screen-control').click(function(){
		var content=$(top.$.find('#iframe-content'));
		var _top = content.css("top");
		if(_top=='60px'){
			$(this).html('退出全屏');
			$(this).removeClass('screen-control-big').addClass('screen-control-small');
			content.css('top','0');
		}else{
			$(this).html('全屏');
			$(this).removeClass('screen-control-small').addClass('screen-control-big');
			content.css('top','60px');
		}
	
	});
	
	//drawCityArea();
	$('.fire-map-toolbar .fire').click(function(){
		fireLayer.removeAllFeatures();
		var $fireLevel=$('.map-fire-level');
		if(!$('.map-fire-level').is(':hidden')){
			$fireLevel.hide();
			$(this).removeClass('fire-active');
		}else{
			var $this = $(this);
			$this.addClass('fire-active');
			drawCityArea(function(){
				$fireLevel.show();
			},function(){
				$this.removeClass('fire-active');
			});
		}
	});
	
	// 图层显示
	$('.fire-map-toolbar .layer-control').click(function(){
		if(globalMapType!="general") {
			if($('.fire-map-toolbar .layer-control').hasClass('layer-control-active')){
				$('.fire-map-toolbar .layer-control').removeClass('layer-control-active')
			}else{
				$('.fire-map-toolbar .layer-control').addClass('layer-control-active');
			}
			$('.map-layer-div').toggle();
		}
	});
	// 可视域显示
	$('.fire-map-toolbar .visiable').click(function(){
		if($('.fire-map-toolbar .visiable').hasClass('visiable-active')){
			if(mapDraw.isShowVisibleArea()){
				$(".fire-map-toolbar .visiable").attr("class","toolbar-icon visiable visiable-open");
			}else{
				$(".fire-map-toolbar .visiable").attr("class","toolbar-icon visiable");
			}
		}else{
			$(".fire-map-toolbar .visiable").attr("class","toolbar-icon visiable visiable-active");
		}
		$('.visiable-layer-div').toggle();
		/*
		if($(this).hasClass('visiable-active')){
			mapDraw.doHideVisibleArea();
			//关闭可视域
			$(this).removeClass('visiable-active');
		}else{
			mapDraw.doShowVisibleArea();
			//开启可视域
			$(this).addClass('visiable-active');
		}
		*/
		//$('.visible-layer-div').toggle();
	});
	
	
	
	fireLayer = new OpenLayers.Layer.Vector();

	appMap.addLayer(fireLayer);
	
	searchLayer= new OpenLayers.Layer.Markers('geo-search-result-markers-layer');
	appMap.addLayer(searchLayer);
	
	
	pathLayer = new OpenLayers.Layer.Vector("path layer");  
	appMap.addLayer(pathLayer);
	
	pathPointLayer = new HikGIS.Layer.GraphicLayer();
	appMap.addLayer(pathPointLayer);
	
	pathLineLayer = new OpenLayers.Layer.Vector();
	var lineStyle={
			strokeWidth : 3,
			strokeOpacity : 1,
			strokeColor : "#FF7E00",
	};
	pathLineTool= new HikGIS.MapDrawTools(appMap,pathLineLayer,lineStyle);
	if($.browser.msie){
		try{
			if(parseInt($.browser.version) == 8){//如果是IE8，半小时执行一次
				setInterval(IE8AutoRefresh,30*60*1000);  
			}
		}catch(e){
			
		}
		
	}
	
	initKms();
	setInterval(playVoice,5000); 
	
});

var polyStyle={
		strokeWidth : 1,
		strokeOpacity : 1,
		strokeColor : "#fff",
		graphicZIndex : 5,
		fillColor : '#000',
		fillOpacity : 0.5
};
var tools = new HikGIS.MapDrawTools(appMap,null,null);

var fireLevelMap={
		'5':'#E05A26',
		'4':'#E08B26',
		'3':'#E0D126',
		'2':'#2B6CBC',
		'1':'#2BBC4B',
}

function drawCityArea(callback,errCallback){
	
	tk.ajax({
		url:path+'/fire!getFireLevel.action',
		succ:function(resp){
			if(resp && resp.result){
				var cityCode = resp.cityCode;
				
				polyStyle.fillColor = fireLevelMap[resp.level];
				
				tools.drawPolygon(resp.data,fireLayer,polyStyle);
				callback();
				$('.fire-update-time').html(resp.time);
				if(resp.center){
					var centerArray=resp.center.split(',');
					var point = new HikGIS.Geometry.Point(parseFloat(centerArray[0]), parseFloat(centerArray[1])).transform("EPSG:4326", "EPSG:900913");; 
					appMap.centerAt(point);
					appMap.zoomTo(7);
				}

			}else{
				if(resp && resp.resultMsg){
					top.$.err(resp.resultMsg);
				}else{
					top.$.err('无法获取火情信息!');
				}
				errCallback();
			}
		}
	});
	

}
function showCurrentAlarm(){
	showAlarm = !showAlarm;
	var count = $(".cur-alarm-info .cur-alarm-card").length;
	if(count>0){
		$('.tab-alarm[data-value="current-alarm"]').click();
		$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
		$(".cur-alarm-list").scrollTop(0);
	}else{
		$('.tab-alarm[data-value="current-alarm"]').html('火灾警报');
		$('.tab-alarm[data-value="history-alarm"]').click();
	}
	if(showAlarm){
        $("#alarm-result").show();
        $('.fire-map-toolbar .tool').removeClass('tool-active')
        $('.tool-div').hide();
    }else{
    	if($('#rescue-force')){
    		$('.alarm-result-tab').show();	
    		$('.cur-alarm-info').show();
    		$('#rescue-force').empty();
    		$('#rescue-force').hide();
    		$('#rescue-force-list').empty();
    		$('#rescue-force-list').hide();
    		mapDraw.removeRescueForceLayers();
    		searchLayer.clearMarkers();	
		}
        $("#alarm-result").hide();
    }
}


function alarmListener(alarmData, dataType){
	//var showCurAlarm = $('.cur-alarm-info').is(':hidden');
	$("#alarm-tips").show();
//	if(showCurAlarm){
//		$("#alarm-tips").show();		
//	}else{
//		$("#alarm-tips").hide();		
//	}
	var num = $("#alarm-tips").attr("num");
	
	if(num){
		num = parseInt(num);
	}else{
		num = 0;
	}
	//if(showCurAlarm){
	if(num>=99){
		$("#alarm-tips").html("99+");
		$("#alarm-tips").attr("num",num+1);
	}else{
		$("#alarm-tips").html(num+1);
		$("#alarm-tips").attr("num",num+1);
	}
	//}
	
	appendAlarmToContainer(alarmData, dataType);
	initShowFire(alarmData,dataType);
}

function initShowFire(data,dataType){
	var longitude=data.longitude;
	var latitude=data.latitude;
	var clongitude=data.object_longitude;
	var clatitude=data.object_latitude;
	var eventLogId;
	var startTime;
	var eventName;
	var indexCode;
	if(isEmpty(longitude) || isEmpty(latitude)){
		return;
	}
	if(dataType=="currentAlarm") {
		eventLogId = data.eventLogId;
		startTime = data.startTime;
		eventName = data.eventName;
		indexCode = data.objectIndexCode;
		clongitude=data.objectLongitude;
		clatitude=data.objectLatitude;
	} else {
		eventLogId = data.event_log_id;
		startTime = data.start_time;
		eventName = data.event_name;
		indexCode = data.object_index_code;
		clongitude=data.object_longitude;
		clatitude=data.object_latitude;
	}
	
	
	var mapcorrect = new MapEPointCorrect();
	var latlong = mapcorrect.encode(parseFloat(longitude),parseFloat(latitude));
	longitude = latlong.b;
	latitude = latlong.a;
	var point = new HikGIS.Geometry.Point(parseFloat(longitude), parseFloat(latitude)).transform("EPSG:4326", "EPSG:900913");
		var size = new OpenLayers.Size(25,38);
		var offset = new OpenLayers.Pixel(-(size.w/2), -20);
		var icon = new OpenLayers.Icon("../../common/themes/base/alarms/alarm-fire.png", size, offset);
		var lonlat = new OpenLayers.LonLat(longitude, latitude).transform("EPSG:4326","EPSG:900913");
		var marker = new OpenLayers.Marker(lonlat, icon);
		alarmGraphicLayer.addMarker(marker);
		fireMarkerArray[eventLogId] = marker;
		fireIconArray[eventLogId] = icon;
		icon.imageDiv.style.cursor = "pointer";
		icon.imageDiv.eventLogId=eventLogId;
		marker.events.register("click", alarmGraphicLayer, function(evt){
			if(!appMap.isMeasure()){//正在测量则不执行
				if($("#"+eventLogId).find(".alarm-card-div .img_icon").length <= 0){
					$("#"+eventLogId).click();
				}else{
					$("#"+eventLogId).find(".alarm-card-div .img_icon").click();
				}
				var preOffset = $(".cur-alarm-list").scrollTop() + parseInt($("#"+eventLogId).position().top);
				$(".cur-alarm-list").animate({scrollTop:preOffset},1000)
			}
		});
		if(!isEmpty(clongitude) && !isEmpty(clatitude)){
			var clatlong = mapcorrect.encode(parseFloat(clongitude),parseFloat(clatitude));
			cEventDrawTools.drawLine([{
				longitude:longitude,
				latitude:latitude
			},{
				longitude:clatlong.b,
				latitude:clatlong.a
			}],eventLogId);
		}
}

function appendAlarmToContainer(data, dataType){
	var eventLogId;
	if($('.cur-alarm-list').find('.grid-nodata').html()!=null){
		$('.cur-alarm-list').html('');
	}
	if(dataType=="currentAlarm") {
		eventLogId = data.eventLogId;
				if(data.picData){
					data.imgUrl = data.picData;
					$('.cur-alarm-list').prepend(createAlarmDiv(data, dataType,"imgTrue"));  //有图片
					$('.cur-alarm-list').find('#'+eventLogId+" .previewButton").click(function(e){
						e.stopPropagation();
						showRealtimeVedio(data,dataType);
					});
					$('.cur-alarm-list').find('#'+eventLogId+" .video_icon").click(function(e){
						e.stopPropagation();
						showRealtimeVedio(data,dataType);
					});															
					var count = $(".cur-alarm-info .cur-alarm-card").length;
					if(count>curAlarmMaxCount){
						$('.cur-alarm-info .cur-alarm-card:last').remove();
						count--;
					}
					$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
				}else{
					$('.cur-alarm-list').prepend(createAlarmDiv(data, dataType,"imgFalse")); //无图片
					$('.cur-alarm-list').find('#'+eventLogId+" .previewButton").click(function(e){
						e.stopPropagation();
						showRealtimeVedio(data,dataType);
					});
					$('.cur-alarm-list').find('#'+eventLogId+" .video_icon").click(function(e){
						e.stopPropagation();
						showRealtimeVedio(data,dataType);
					});															
					var count = $(".cur-alarm-info .cur-alarm-card").length;
					if(count>curAlarmMaxCount){
						$('.cur-alarm-info .cur-alarm-card:last').remove();
						count--;
					}
					$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
				}
				
	}else {
		eventLogId = data.event_log_id;
		setTimeout(function(){
					if(data.pic_data){
						data.imgUrl = data.pic_data;
						$('.cur-alarm-list').prepend(createAlarmDiv(data, dataType,"imgTrue"));  //有图片
						$('.cur-alarm-list').find('#'+eventLogId+" .previewButton").click(function(e){
							e.stopPropagation();
							showRealtimeVedio(data,dataType);
						})
						$('.cur-alarm-list').find('#'+eventLogId+" .video_icon").click(function(e){
							e.stopPropagation();
							showRealtimeVedio(data,dataType);
						})																		
						var count = $(".cur-alarm-info .cur-alarm-card").length;
						if(count>curAlarmMaxCount){
							$('.cur-alarm-info .cur-alarm-card:last').remove();
							count--;
						}
						$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
					}else{
						$('.cur-alarm-list').prepend(createAlarmDiv(data, dataType,"imgFalse")); //无图片
						$('.cur-alarm-list').find('#'+eventLogId+" .previewButton").click(function(e){
							e.stopPropagation();
							showRealtimeVedio(data,dataType);
						})
						$('.cur-alarm-list').find('#'+eventLogId+" .video_icon").click(function(e){
							e.stopPropagation();
							showRealtimeVedio(data,dataType);
						})																		
						var count = $(".cur-alarm-info .cur-alarm-card").length;
						if(count>curAlarmMaxCount){
							$('.cur-alarm-info .cur-alarm-card:last').remove();
							count--;
						}
						$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
					}
						if(data.mode && data.object_index_code && data.towerName){
							var detectionMode = data.mode;
							var towerName = data.towerName;
							if(detectionMode == "1" && cruiseStatus == 0){
								$.confirm("瞭望塔\""+towerName+"\"检测到火点，已停止巡航，是否立即继续巡航?",function(){
									tk.ajax({
										url : 'alarmEvent!startFireScan.action',
										data : {
											cameraIndexCode : data.object_index_code
										},
										succ : function(data) {
											if(data){
												top.$.tip("瞭望塔\""+towerName+"\" 已开启继续巡航");
												cruiseStatus = 0;
											}else{
												top.$.err("瞭望塔\""+towerName+"\" 继续巡航开启失败！");
												cruiseStatus = 1;
											}
										}
									});
								},function(){
									cruiseStatus = 1;
								});
							}
						}
					
					
		},1);
	}
	
	
	
	
/*	$('.cur-alarm-list').find('#'+eventLogId+" .img_icon").click(function(e){
		e.stopPropagation();
		//获取联动图片
		tk.ajax({
			url : 'alarmEvent!getAlarmPicture.action',
			data : {
				eventLogId : data.event_log_id
			},
			succ : function(dataResult) {
				if(dataResult.imgUrl){
					imgOpen(dataResult.imgUrl,data.event_log_id);
				}else{
					top.$.err('无联动图片!');
				}
			}
		});
	})*/
}

function lonlatConvert(degree){
	var lonDegree = parseInt(degree);
	var lonMin = (degree - lonDegree)*60;
	var lonSec = (lonMin - parseInt(lonMin))*60; 
	return lonDegree+"°"+parseInt(lonMin)+"′"+Math.round(lonSec)+"″";
}


var alarmDatas= [];
var alarmDataTypes = [];
var imgFlags = [];
function createAlarmDiv(data, dataType, imgFlag){
	var imgUrls = data.imgUrl;
	var eventLogId;
	var startTime;
	var eventName;
	var indexCode;
	var distance = data.distance;
	var direction = data.direction;
	var level = data.fireLevel;
	var clongitude;
	var clatitude;
	if(dataType=="currentAlarm") {
		eventLogId = data.eventLogId;
		startTime = data.startTime;
		eventName = data.eventName;
		indexCode = data.objectIndexCode;
		clongitude=data.objectLongitude;
		clatitude=data.objectLatitude;
	} else {
		eventLogId = data.event_log_id;
		startTime = data.start_time;
		eventName = data.event_name;
		indexCode = data.object_index_code;
		clongitude=data.object_longitude;
		clatitude=data.object_latitude;
	}
	if(!distance){
		distance='';
	}
	if(!direction){
		direction='';
	}
	
	var longitude=lonlatConvert(data.longitude);
	var latitude=lonlatConvert(data.latitude);
	var html = '';
	html+='<div id='+eventLogId+' no = '+alarmDatas.length+' class="cur-alarm-card" >';
	html+='<div class="alarm-card-info">';
	html+='<div class="alarm-card-div">'
	html+='<div style="color:#777;width:300px;height:20px;white-space:nowrap;" >';
	
	if(level==1){		
		//position:absolute;
		html+='<span class="item-level" style=" background-color:#F9A520;color:#FFFFFF;">一级</span>	';		
	}else if(level==2){
		html+='<span class="item-level" style=" background-color:#F96D20;color:#FFFFFF;">二级</span>	';				
	}else if(level==3){
		html+='<span class="item-level" style=" background-color:#D92020;color:#FFFFFF;">三级</span>	';			
	}else{
		html+='<span class="item-level" style=" background-color:#D3D3D3;color:#666666;">未处理</span>';		
	}	
			
	
	html+='	<span class="alarm-name-info" title="'+eventName+'" style="display: block;">'+eventName+'</span>';
	if(imgFlag=='imgTrue'){
		html+='	<span class="img_icon" isShow="false" imgId="'+alarmDatas.length+'" imgUrls="'+imgUrls+'"></span>';	}
	
	alarmDatas[alarmDatas.length] = data;	
	alarmDataTypes[alarmDataTypes.length] = dataType;	
	imgFlags[imgFlags.length] = imgFlags;
	// 更新告警
	if($('#iframe-content',window.parent.document).siblings('.c-dialog').attr('class')!==undefined && $('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe').length >0 && $('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow != null && $('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow.setParments){
		$('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow.setParments(kms,alarmDatas,alarmDataTypes,imgFlags)
	}	
	
	if(indexCode!=null&&indexCode!=''){
		html+='	<span class="video_icon" isShow="false" imgUrls="'+imgUrls+'"></span>';
	}
		
	var arr = startTime.split('-');
	startTime=arr[1] + "/" + arr[2];
	
	html+='</div>';
	html+='<div style="width: 232px; white-space: nowrap;height:12px;line-height:12px;margin-top:10px;margin-bottom:8px;color:#999;">';
	html+='<span>'+startTime;
	if(distance){
    	html+=  ' '+distance+'公里';
    }
    if(direction){
    	html+=  ' '+direction;
    }
    html+='</span>';
	html+='</div>';
	html+='<div style="color:#999;height:12px;line-height:12px;">';
	html+='<span class="alarm-location-info" indexCode="'+indexCode+'" longitude='+data.longitude+' latitude='+data.latitude+' clongitude='+clongitude+' clatitude='+clatitude+' isShow="true">经度:'+longitude+' 纬度:'+latitude+'</span>';
	html+='</div>';
	html+='<div class="currentButton" style="display:none;margin-top:20px;position:relative;height:12px;line-height:12px;">';

	
    if(level==1 || level==2 || level==3){	
		html+='<a class="moredeal" style="margin-right:25px" onclick="searchEmergency(\''+level+'\')">应急预案</a>';    	
		html+='<a class="moredeal fireforce" style="margin-right:25px;'+(mdlFireCommand==1?"":"display:none")+'" onclick="searchRescueForce(\''+eventLogId+'\','+data.longitude+','+data.latitude+')">救援力量</a>';
		html+='<a class="moredeal" style="margin-right:25px" onclick="fireAlarmReport(\''+eventLogId+'\')">上报火情</a>';
		html+='<a class="moredeal" style="margin-right:25px" onclick="handleFire(\''+eventLogId+'\')">扑火完毕</a>';
    }else{
		html+='<a class="confirm_button" id="dialog-btn-arrow-bottom'+eventLogId+'" style="margin-left: 120px" onclick="showDialogBottom(\''+eventLogId+'\')">立即处理</a>';
		html+='<a class="moredeal" style="display:none;margin-right:25px" onclick="searchEmergency(\''+level+'\')">应急预案</a>';    	
		html+='<a class="moredeal fireforce" style="display:none;margin-right:25px" onclick="searchRescueForce(\''+eventLogId+'\','+data.longitude+','+data.latitude+')">救援力量</a>';
		html+='<a class="moredeal" style="display:none;margin-right:25px" onclick="fireAlarmReport(\''+eventLogId+'\')">上报火情</a>';
		html+='<a class="moredeal" style="display:none;margin-right:25px" onclick="handleFire(\''+eventLogId+'\')">扑火完毕</a>';    	
    }	
	html+='<div class="deal" style="display:none;position:absolute;left:95px;top:30px;z-index:9999" ><div class="fir">火情<div class="dealfir" style="display:none; position:absolute;left:108px;top:-1px;z-index:111;width:80px;height:60px;"><span class="fire-level " dataIndex="1">一级</span><span class="fire-level" dataIndex="2">二级</span><span class="fire-level" dataIndex="3">三级</span></div></div><div class="nofir">非火情<div class="dealnofir" style="display:none; position:absolute;left:108px;top:-1px;z-index:111;width:80px;height:60px;"><span class="misinformation-type" dataIndex="4">误报</span><span class="misinformation-type" dataIndex="5">居民用火</span><span class="misinformation-type" dataIndex="6">工业用火</span><span class="misinformation-type" dataIndex="7">燃烧杂草</span></div></div>';
	html+='</div>';
	html+='</div>';
	html+='</div>';
	html+='</div>';	
	html+='</div>';		
	return html;
}

var searchRescueForceCanClick = true;

function searchRescueForce(eventLogId,longitude,latitude){

	$('.alarm-result-tab').hide();	
	$('.cur-alarm-info').hide();
	$('#rescue-force').show();
	$('#rescue-force-list').show();
	$('#rescue-force-list-show').show();
	$('#rescue-force').empty();
	$('#rescue-force-list').empty();
	$('#rescue-force-list-show').empty();		
/*    html="<div class='search' id=SearchBox'>"+
		    "<input type='text' class='search_box w200' id='SearchBox'>"+
		    "<a class='buttonS bDefault'>查找救援力量</a>"+		    
	    "</div>";*/
	
	    html="<div class='wrapper grid-m0s6'>"+
		    	 "<div class='col-main' style='width:180px;float:left'>" +
		    	 	"<div class='pd10 span' id='SearchBox1' style=>"+
		    	 		"<input type='text' id='resourceSearchBox' placeholder='单位:公里（Km）' >"+	     //单位:公里（Km）
		    	 		"<label class='tip topLeft info' for='resourceSearchBox' generated='true' style='display: none; left: 10px; position: absolute; max-width: 250px; top: 110px; margin-left: 0px; opacity: 1; z-index: 11491042736;'>单位:公里（Km）<i class='arrow'><b></b></i></label>"+
				    "</div>" +
				 "</div>"+
			     "<div class='col-sub' style='width:112px;margin-left: 2px;float:left''>" +
		 		 	"<div class='pd10 span' style='width:112px'>" +
		 		 		"<a class='buttonS bDefault' >查找救援力量</a>" +
		 		 	"</div>" +
		 		 "</div>" +
			 "</div>";

    $('#rescue-force').prepend(html);	
    
	$('#rescue-force').prepend('<a style="padding:5px ;cursor:pointer;margin:5px 0 0 10px;" class="back" href="javascript:void(0)">< 返回</a>'+$('#'+eventLogId).find(".alarm-card-info").html());	
	$('#rescue-force').find('.currentButton').remove();	
//	$('#rescue-force').find('.img_icon').removeClass("img_icon").addClass("img_icon_disabled").html("");
//	$('#rescue-force').find('.video_icon').removeClass("video_icon").addClass("video_icon_disabled").html("");
	$('#rescue-force').find('.img_icon').remove();
	$('#rescue-force').find('.video_icon').remove();
	$('#rescue-force').find('.alarm-name-info').css("max-width","210px");
    $('#resourceSearchBox').focus(function(){
        $(this).parent().find('label').show();
    });
    
    $('#resourceSearchBox').blur(function(){
        $(this).parent().find('label').hide();
    }); 
	
	$('.back').on('click',function(){
		$('.alarm-result-tab').show();	
		$('.cur-alarm-info').show();
		$('#rescue-force').empty();
		$('#rescue-force').hide();
		$('#rescue-force-list').empty();
		$('#rescue-force-list-show').empty();
		$('#rescue-force-list-show').hide();
//		$("#rescue-force-list-show").getNiceScroll().hide();
		$('#rescue-force-list').hide();
		mapDraw.removeRescueForceLayers();
		searchLayer.clearMarkers();	
		searchRescueForceCanClick = true;
	});
	
	$('#rescue-force').find(".buttonS").on('click',function(){
		var val = $("#resourceSearchBox").val();
		if(val==""){
			val="10";
		}
		rescueForce(eventLogId,val,longitude,latitude);	
	});		
	$('#resourceSearchBox').focus();
}


function showMore(){
	if($('#showMore').css("display")=="none"){
		$('#showMore').css('display','block');
	}else{
		$('#showMore').css('display','none');
	}
}

function rescueForce(eventLogId,val,longitude,latitude){
	if(!searchRescueForceCanClick){
		top.$.err('请不要操作过快！');
		return;
	}
	searchRescueForceCanClick = false;
	var patrn = /^\d+(\.\d{1,3})?$/;
	if(!patrn.exec(val)){
		searchRescueForceCanClick = true;		
		top.$.err('请输入正确的范围, 请输入最高保留三位小数的数字！');
		return;
	}
	if(val>1000||val<0){
		searchRescueForceCanClick = true;		
		top.$.err('请输入0-1000范围内的数字！');
		return;
	}
	var indexCode;
	$('#rescue-force-list').empty();
	$('#rescue-force-list-show').empty();
	showRescueForceTab(longitude,latitude,val);	   
	tk.ajax({
		url : 'alarmEvent!rescueForce.action',
		data : {
			eventLogId : eventLogId,
			range:val*1000
		},
		succ : function(response) {
			if(response){
				
				for(var i=0;i<response.length;i++){	
					var data = response[i];
					var start = getStart(data.longitude,data.latitude,data.isNeedCorrect);
					var end = getEnd(longitude,latitude);
					data.lineLength = getLineLength(start,end);
				}
				
				    for(var i=0;i<response.length-1;i++){
				        for(var j=i+1;j<response.length;j++){  
				            if(response[i].lineLength>response[j].lineLength){//如果前面的数据比后面的大就交换  
				                var temp=response[i];  
				                response[i]=response[j];  
				                response[j]=temp;  
				            }  
				        }  
				    }   
				
				
				var html='';   //<div class=save-list-div>
				for(var i=0;i<response.length;i++){						
					var data = response[i];
					/*if(data.type == response[0].type){*/
					
						if(data.type == "firefighting-team" ){
							html+= '<div class="save-list" id='+data.type+' data-longitude='+data.longitude+' data-latitude='+data.latitude+' data-isNeedCorrect='+data.isNeedCorrect+' lineLength='+data.lineLength+' style="display:block"><span class="save-list-name" title="'+data.name+'">'+data.name+'</span><span class="phone" title="队长手机：'+data.captainPhone+'"></span></div>';
						}else{
							html+= '<div class="save-list" id='+data.type+' data-longitude='+data.longitude+' data-latitude='+data.latitude+' data-isNeedCorrect='+data.isNeedCorrect+' lineLength='+data.lineLength+' style="display:block"><span class="save-list-name" title="'+data.name+'">'+data.name+'</span></div>';
						}				
				/*	}else{
						if(data.type == "firefighting-team" ){
							html+= '<div class="save-list" id='+data.type+' data-longitude='+data.longitude+' data-latitude='+data.latitude+' data-isNeedCorrect='+data.isNeedCorrect+' lineLength='+data.lineLength+' style="display:none">'+data.name+","+data.captainPhone+'</div>';
						}else{
							html+= '<div class="save-list" id='+data.type+' data-longitude='+data.longitude+' data-latitude='+data.latitude+' data-isNeedCorrect='+data.isNeedCorrect+' lineLength='+data.lineLength+' style="display:none">'+data.name+'</div>';
						}
					}*/
				}
				//html+='</div>';
				$('#rescue-force-list-show').append(html);
/*				$("#rescue-force-list-show").niceScroll({
			        cursoropacitymin : 0.1,
			        cursoropacitymax : 0.9,
			        cursorcolor : "#adafb5",
			        cursorwidth : "8px",
			        cursorborder : "",
			        cursorborderradius : "4px",
			        usetransition : 500,
			        background : "",
			        autohidemode:false,
			        railoffset : {
			            top : 0,
			            left : 0
			        }
				});*/
//				$("#rescue-force-list-show").getNiceScroll().show();
				//第一次加载  搜索扑火队
				indexCode = 'firefighting-team';
				showRescueForce(indexCode,longitude,latitude,val);
				
			}
		}
	});	
}

function getStart(longitude,latitude,dataIsNeedCorrect){
    if(dataIsNeedCorrect==1){
    	var mapcorrect = new MapEPointCorrect();
		var latlong=mapcorrect.encode(parseFloat(longitude),parseFloat(latitude));
		longitude = latlong.b;
		latitude=  latlong.a;	    	
    }
	var point = new HikGIS.Geometry.Point(parseFloat(longitude), parseFloat(latitude)).transform("EPSG:4326", "EPSG:900913");
	var start = new OpenLayers.Geometry.Point(point.x, point.y);		
	return start;
}

function getEnd(lng,lat){
	var mapcorrect = new MapEPointCorrect();
	var latlong=mapcorrect.encode(parseFloat(lng),parseFloat(lat));
	lng = latlong.b;
	lat = latlong.a;
	var firePoint = new HikGIS.Geometry.Point(parseFloat(lng), parseFloat(lat)).transform("EPSG:4326", "EPSG:900913");
	var end = new OpenLayers.Geometry.Point(firePoint.x, firePoint.y);
	return end;
}

function getLineLength(start,end){
	var line = new OpenLayers.Geometry.LineString([start, end]);
	return line.getLength();
}

function showRescueForceTab(longitude,latitude,val){
	tk.ajax({
		url : 'alarmEvent!getMapResource.action',
		succ : function(response) {
			if(response){
				var html='';
				for(var i=0;i<response.length;i++){						
					var data = response[i];
					if(i==0){
						html+='<button class="alarm_button moredeal rescueforcetab" style="margin-left: 10px;background-color: #299F43;color:#fff;" onclick="showRescueForce(\''+data.code+'\','+longitude+','+latitude+','+val+')">'+data.name+'</button>';						
					}else if(i<3){
						html+='<button class="alarm_button moredeal rescueforcetab" style="margin-left: 10px" onclick="showRescueForce(\''+data.code+'\','+longitude+','+latitude+','+val+')">'+data.name+'</button>';						
					}
					if(i==3 && response.length==3){
						html+='<button class="alarm_button moredeal rescueforcetab" style="margin-left: 10px" onclick="showRescueForce(\''+data.code+'\','+longitude+','+latitude+','+val+')">'+data.name+'</button>';
					}
					if(i==3 && response.length>3){
						html+='<button class="alarm_button moredeal rescueforcetab" style="margin-left: 10px" onclick="showMore()">更多</button>';
						html+='<div id="showMore" style="display:none;position:absolute;left:241px;top:194px;">'+
						'<button class="alarm_button moredeal rescueforcetab" onclick="showRescueForce(\''+data.code+'\','+longitude+','+latitude+','+val+')">'+data.name+
						'</button>';
					}
					if(i>3){
						html+='<button class="alarm_button moredeal rescueforcetab" onclick="showRescueForce(\''+data.code+'\','+longitude+','+latitude+','+val+')">'+data.name+
						'</button>';						
					}
				}
				$('#rescue-force-list').empty();
				$('#rescue-force-list').prepend(html);												
			}
		}
	});		
}

function searchEmergency(level){
	var searchEmergencyDlg = top.$.dialog({
		title : '查看预案',
		height : 480,
		width : 450,
		foothide: true,
		url : path+'/module/emergency/searchEmergency.jsp',
		afterClose:function(){

        },
		load:function(options){
			this.getList(level,"");
        }
    });	
}

function showRescueForce(code,lng,lat,val){
	$('#showMore').hide();
	if(code == null){
		code = 'firefighting-team';
	}
	if($("#rescue-force-list").children("button").hasClass("selected")||$("#showMore").children("button").hasClass("selected")){
		$("#rescue-force-list").find("button").removeClass("selected");
		$("#rescue-force-list").find("button").css({'background-color':'#F1F1F1','color':'#333'});
		$(window.event.srcElement || window.event.target).addClass("selected");
/*		$("#rescue-force-list").find("button").attr("style","margin-left:10px");*/
		$(window.event.srcElement || window.event.target).css({'background-color':'#299F43','color':'#fff'});
		if($("#rescue-force-list").children("button").hasClass("selected")){
			$("#rescue-force-list").children("button").last().text('更多');
			$("#rescue-force-list").children("button").last().css({'background-color':'#F1F1F1','color':'#333'});
		}
		if($("#showMore").children("button").hasClass("selected")){
			$("#rescue-force-list").children("button").last().css({'margin-left':'10px','background-color':'#299F43','color':'#fff'});
			$("#rescue-force-list").children("button").last().text($(window.event.srcElement || window.event.target).text());
		}
	}else if($("#rescue-force-list").children("button").first().css('background-color')=='rgb(41, 159, 67)'){
		$("#rescue-force-list").children("button").first().addClass("selected");
	}
	$("#rescue-force-list-show").children("div").css('display','none');
	searchLayer.clearMarkers();	
	
	var mapcorrect = new MapEPointCorrect();/*
	var latlong=mapcorrect.encode(parseFloat(lng),parseFloat(lat));
	lng = latlong.b;
	lat = latlong.a;*/
	var firePoint = new HikGIS.Geometry.Point(parseFloat(lng), parseFloat(lat)).transform("EPSG:4326", "EPSG:900913");
	var end = new OpenLayers.Geometry.Point(firePoint.x, firePoint.y);
	var longitude;
	var latitude;
    var length = $("#rescue-force-list-show").children("#"+code).length;
    var markerNum=0;
    for(var i=0;i<length;i++){
    	var rescueForce = $("#rescue-force-list-show").children("#"+code).eq(i);
    	
	    longitude = rescueForce.attr("data-longitude");
	    latitude = rescueForce.attr("data-latitude");
	    
	    if(rescueForce.attr("data-isNeedCorrect") != 1){	    	
			var latlong=mapcorrect.decode(parseFloat(longitude),parseFloat(latitude));
			longitude = latlong.lon;
			latitude=  latlong.lat;	    	
	    }	    
		var point = new HikGIS.Geometry.Point(parseFloat(longitude), parseFloat(latitude)).transform("EPSG:4326", "EPSG:900913");
		var start = new OpenLayers.Geometry.Point(point.x, point.y);
		var line = new OpenLayers.Geometry.LineString([start, end]);
		
		if(line.getLength() < val*1000){
			
			if(rescueForce.html().indexOf("米") == -1 ){
				rescueForce.html("<i class='search-index-"+markerNum+"'></i>" + rescueForce.html()+"<span style='float:right;'>"+(line.getLength()/1000).toFixed(3)+"千米</span>");
		    }	
			rescueForce.css('display','block');			
			
			if(markerNum <10){
				var size = new OpenLayers.Size(19,31);
				var offset = new OpenLayers.Pixel(-(size.w/2), -40);	
				var icon = new OpenLayers.Icon("../../common/themes/base/images/search/"+markerNum+".png", size, offset);
				markerNum +=1;
				
				var latlong=mapcorrect.encode(parseFloat(longitude),parseFloat(latitude));
				longitude = latlong.b;
				latitude=  latlong.a;	    	
		        				
				lonlat = new OpenLayers.LonLat(longitude, latitude).transform("EPSG:4326","EPSG:900913");
				marker = new OpenLayers.Marker(lonlat, icon);
				searchLayer.addMarker(marker);
			}	
		}	
    }
    
    if(markerNum==0){
		var htmlNoData = '<div class="grid-nodata" style="position:relative;"><div class="grid-nodata-tip"  style="margin-left:240px;text-align:center;color:#ccc;margin-top:80px;">没有数据</div></div>';
		$('#rescue-force-list').prepend(htmlNoData);
    }else{
    	$('.grid-nodata').remove();
    }
    
	longitude = $("#rescue-force-list-show").children("#"+code).attr("data-longitude");
	latitude = $("#rescue-force-list-show").children("#"+code).attr("data-latitude");
	
	var latlong=mapcorrect.encode(parseFloat(longitude),parseFloat(latitude));
	longitude = latlong.b;
	latitude=  latlong.a;	
			
	var point = new HikGIS.Geometry.Point(parseFloat(longitude), parseFloat(latitude)).transform("EPSG:4326", "EPSG:900913");
		
	var latlong=mapcorrect.encode(parseFloat(lng),parseFloat(lat));
	lng = latlong.b;
	lat = latlong.a;
	firePoint = new HikGIS.Geometry.Point(parseFloat(lng), parseFloat(lat)).transform("EPSG:4326", "EPSG:900913");
	
	mapDraw.removeRescueForceLayers();
	mapDraw.drawRescueForceCircle(firePoint.x,firePoint.y,val*1000);	
	
//	appMap.zoomTo(1);
//	var n=1;
//	while(polymerize.getGraphicPMpoi(new HikGIS.Graphic(point)) && n<15){
//		//appMap.zoomTo(i++);
//		appMap.centerAt(point);
//		appMap.zoomTo(n++);
//	}
	//appMap.centerAt(point);
	searchRescueForceCanClick = true;          //恢复点击
}

function fireAlarmReport(eventLogId){
	var fireAlarmReportDlg = top.$.dialog({
//		id:'',
		title : '火情上报',
		height : 530,
		width : 720,
		foothide: false,
		ok:true,
		cancel : true,
		label: {
            ok: '发送', // ok按钮默认名称  
            cancel: '取消' // cancel按钮默认名称  
        },
		url : path+'/module/fireGuard/fireAlarmReport.jsp',
		afterClose:function(){
        },
		load:function(options){
			this.setEventLogId(eventLogId);
        },ok:function(options){
        	this.frame.send();
        	this.frame.setFireAlarmReportDlg(fireAlarmReportDlg);
        },cancel:function(){
        },
	});
}

function showDialogBottom(eventLogId){
	var e = window.event;
    e.cancelBubble = true;
	$('#'+eventLogId+' .deal').css('display','block');
	$('#'+eventLogId+' .deal').css('top','22px');
	$('#'+eventLogId+' .dealfir').css('top','-1px');
	$('#'+eventLogId+' .dealnofir').css('top','-1px');
	
	if($('#'+eventLogId+' .deal').offset().top > 410){
		$('#'+eventLogId+' .deal').css('top','-66px');
		$('#'+eventLogId+' .dealfir').css('top','-59px');
		$('#'+eventLogId+' .dealnofir').css('top','-88px');
	}
	
	$('#'+eventLogId+' .fir').mouseover(function(){
	    $('#'+eventLogId+' .fir div').show();
    })
    $('#'+eventLogId+' .fir').mouseout(function(){
    	$('#'+eventLogId+' .fir div').hide();
    })
    $('#'+eventLogId+' .nofir').mouseover(function(){
    	$('#'+eventLogId+' .nofir div').show();
    })
    $('#'+eventLogId+' .nofir').mouseout(function(){
    	$('#'+eventLogId+' .nofir div').hide();
    })
	$('#'+eventLogId+' .fire-level').click(function(){
		var level = $(this).attr('dataIndex');
		var $this=$(this);
		top.$.confirm('确定要提交吗？', function() {
			tk.ajax({
				url : 'alarmEvent!saveFireLevel.action',
				data : {
					fireLevel : level,
					eventLogId : eventLogId
				},
				succ : function(data) {
					if(data){
						top.$.tip('保存成功！');
/*						$('#'+eventLogId).remove();
						var count = $(".cur-alarm-info .cur-alarm-card").length;
						if(count>0){
							$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
							if(count>99){
								$("#alarm-tips").attr("num","99+");
								$("#alarm-tips").html('99+');
							}else{
								$("#alarm-tips").attr("num",count);
								$("#alarm-tips").html(count);
							}
						}else{
							$('.tab-alarm[data-value="current-alarm"]').html('火灾警报');
							$("#alarm-tips").hide();
							$("#alarm-tips").attr("num","0");
							$('.cur-alarm-list').html('<div class="grid-nodata" style="display: block;top:0">       <div class="grid-nodata-container" style="left:35%;">           <div class="grid-nodata-tip">没有数据</div>       </div>   </div>');
						}*/
						var firdom = $this.parent().parent().parent().parent().parent().find('.item-level');
						if(level==1){
							firdom.text('一级');
							firdom.css('color','#FFFFFF');	
							firdom.css('backgroundColor','#F9A520');	
							firdom.show();		
						}else if(level==2){
							firdom.text('二级');
							firdom.css('color','#FFFFFF');
							firdom.css('backgroundColor','#F96D20');	
							firdom.show();		
						}else if(level==3){
							firdom.text('三级');
							firdom.css('color','#FFFFFF');
							firdom.css('backgroundColor','#D92020');
							firdom.show();
						}
						$('.deal').hide();
						$this.parent().parent().parent().hide();
						$this.parent().parent().parent().parent().find('.moredeal').show();
						if(mdlFireCommand != 1){
							$this.parent().parent().parent().parent().find('.fireforce').hide();
						}
						$this.parent().parent().parent().prev().prev().prev().prev().attr('onclick','searchEmergency(\''+level+'\')');
						$this.parent().parent().parent().prev().prev().prev().prev().prev().removeClass('confirm_button').hide();
					}else{
						top.$.err('保存失败！');
					}
				}
			});
		});
	});
    
    $('#'+eventLogId+' .misinformation-type').click(function(){
    	var status = $(this).attr('dataIndex');
    	var level = status-3;   	
		status = 2;
    	var $this = $(this);
    	top.$.confirm('确定要提交吗？', function() {
    		tk.ajax({
    			url : 'alarmEvent!misinformation.action',
    			data : {
    				eventLogId:eventLogId,
    		        status:status,
    		        fireLevel:level
    			},
    			succ : function(data) {
    				if(data){
    					top.$.tip('保存成功！');
    					$('.deal').hide();
    					$('#'+eventLogId).remove();
    					destoryFire(eventLogId);
    					// alert('1')
    					// var count = $(".cur-alarm-info .cur-alarm-card").length;
    					// if(count>0){
    					// 	$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
    					// 	if(count>99){
    					// 		$("#alarm-tips").attr("num","99+");
    					// 		$("#alarm-tips").html('99+');
    					// 	}else{
    					// 		$("#alarm-tips").attr("num",count);
    					// 		$("#alarm-tips").html(count);
    					// 	}
    					// }else{
    					// 	$('.tab-alarm[data-value="current-alarm"]').html('火灾警报');
    					// 	$("#alarm-tips").hide();
    					// 	$("#alarm-tips").attr("num","0");
    					// 	$('.cur-alarm-list').html('<div class="grid-nodata" style="display: block;top:0">       <div class="grid-nodata-container" style="left:35%;">           <div class="grid-nodata-tip">没有数据</div>       </div>   </div>');
    					// }
    					
    				}else{
    					top.$.err('保存失败！');
    				}
    			}
    		});
    	 });
      });
}
      
function handleFire(eventLogId){
	top.$.confirm('确定要扑火完毕吗？', function() {
		tk.ajax({
			url : 'alarmEvent!saveFire.action',
			data : {
				eventLogId : eventLogId
			},
			succ : function(data) {
				if(data){
					top.$.tip('保存成功！');
					$('#'+eventLogId).remove();
					destoryFire(eventLogId);
					var count = $(".cur-alarm-info .cur-alarm-card").length;
					if(count>0){
						$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
						if(count>99){
							$("#alarm-tips").attr("num","99+");
							$("#alarm-tips").html('99+');
						}else{
							$("#alarm-tips").attr("num",count);
							$("#alarm-tips").html(count);
						}
					}else{
						$('.tab-alarm[data-value="current-alarm"]').html('火灾警报');
						$("#alarm-tips").hide();
						$("#alarm-tips").attr("num","0");
						$('.cur-alarm-list').html('<div class="grid-nodata" style="display: block;top:0">       <div class="grid-nodata-container" style="left:35%;">           <div class="grid-nodata-tip">没有数据</div>       </div>   </div>');
					}
					if(arrowDialog && arrowDialog.close){
						arrowDialog.close();
					}
					
				}else{
					top.$.err('保存失败！');
				}
			}
		});
	});	
}

/**
 * 删除火点
 * @param eventLogId
 */
function destoryFire(eventLogId){
	if(alarmLineArray){
		var lineVector = alarmLineArray[eventLogId];
		if(lineVector){
		   cEventDrawTools.removeLine(lineVector);
		   delete alarmLineArray[eventLogId];
		}
	}
	if(fireMarkerArray){
		var fireMarker = fireMarkerArray[eventLogId];
		if(fireMarker){
			alarmGraphicLayer.removeMarker(fireMarker);
			delete fireMarkerArray[eventLogId];
		}
	}
	$(".general_alarm_content").remove();
	
}


/*function misinformation(eventLogId){
	//top.$.confirm('确定要提交吗？', function() {
		tk.ajax({
			url : 'alarmEvent!misinformation.action',
			data : {
				eventLogId : eventLogId
			},
			succ : function(data) {
				if(data){
					top.$.tip('保存成功！');
					$('#'+eventLogId).remove();
					var count = $(".cur-alarm-info .cur-alarm-card").length;
					if(count>0){
						$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
						if(count>99){
							$("#alarm-tips").attr("num","99+");
							$("#alarm-tips").html('99+');
						}else{
							$("#alarm-tips").attr("num",count);
							$("#alarm-tips").html(count);
						}
					}else{
						$('.tab-alarm[data-value="current-alarm"]').html('火灾警报');
						$("#alarm-tips").hide();
						$("#alarm-tips").attr("num","0");
						$('.cur-alarm-list').html('<div class="grid-nodata" style="display: block;top:0">       <div class="grid-nodata-container" style="left:35%;">           <div class="grid-nodata-tip">没有数据</div>       </div>   </div>');
					}
					
				}else{
					top.$.err('保存失败！');
				}
			}
		});
	//});
}*/

function initMoveDevice(data) {
	for(var key in data) {
		moveGraphicLayer[key] = new HikGIS.Layer.GraphicLayer();
//		//将矢量图层添加到地图中
		appMap.addLayer(moveGraphicLayer[key]);
		for(var i = 0, j = data[key].length; i < j; i++) {
			//创建点对象
			var point = new HikGIS.Geometry.Point(parseFloat(data[key][i].longitude), parseFloat(data[key][i].latitude)).transform("EPSG:4326","EPSG:900913");
			//创建样式
			var sym = new HikGIS.Symbol.PictureMarkerSymbol(data[key][i].iconPath, 30, 30);
			var textSym = new HikGIS.Symbol.TextSymbol(data[key][i].elementName);
			var cmsSymbol = new HikGIS.Symbol.CompositeSymbol([sym, textSym,data[key][i].elementId]);
			//创建点图标
			var pointGraphic = new HikGIS.Graphic(point, cmsSymbol, {id:data[key][i].elementId, type:key});
			//缓存移动设备
			moveGraphics[data[key][i].elementId] = pointGraphic;
			//绑定元素单击事件
//			pointGraphic.addEventListener('click', function(graphic){
//				showElementInfo(graphic.attributes.id, graphic.attributes.type, graphic.geometry);
//				clickElementChange(graphic);
//				resetExtent(graphic, appMap);
//			});
			//添加元素对应的图层
			moveGraphicLayer[key].add(pointGraphic);
		}
	}
}


function initExtentCallback() {
	loadMap();
}
var targetMove = null;

function setGpsData(msg) {
	var graphic = moveGraphics[msg.elementId];
	if(!graphic)return;
	
	var values = msg.Value.split(",");
	//y轴
	var latitude = parseFloat(values[0]);
	//x轴
	var longitude = parseFloat(values[1]);
	var speed = values[2];
	var direction = parseInt(values[3]);
	var height = values[4];
	
	if(parseInt(longitude) == 0 && parseInt(latitude) == 0){
		return;
	}
	var mapcorrect = new MapEPointCorrect();
	var latlong = mapcorrect.encode(longitude,latitude);
	var enlongitude = latlong.b;
	var enlatitude = latlong.a;
	
	var point = new HikGIS.Geometry.Point(enlongitude, enlatitude).transform("EPSG:4326","EPSG:900913");
	graphic.setGeometry(point);
	graphic.refresh();

	if(searchLayer && searchLayer.markers && searchLayer.markers.length>0){
		 var markers= searchLayer.markers;
		 for(var i=0;i<markers.length;i++){
			 var marker = markers[i];
			 if(marker.indexCode==msg.deviceIndexCode){
				 marker.lonlat.lon = point.x;
				 marker.lonlat.lat = point.y;
				 break;
			 }
		 }
		 searchLayer.redraw();
	}
	var shotLng=Math.round((longitude)*100)/100; 
	var shotLat=Math.round((latitude)*100)/100; 
	var $resultAInfo = $('#result-grid a[data-indexCode="'+msg.deviceIndexCode+'"]');
	if($resultAInfo && $resultAInfo.length>0){
		$resultAInfo.attr('data-latitude',enlatitude);
		$resultAInfo.attr('data-longitude',enlongitude);
		var posInfo ="";
		if(msg.elementType == "2003"){
			posInfo += "高度:"+parseFloat(height)/100+"米 ";
		}
		posInfo += '经度:'+shotLng+" 纬度:"+shotLat;
		
		$resultAInfo.find('.pos-info').html(posInfo);		
	}
	
	//如果点击跟踪，则当前移动设备一致处于地图中心点
	if(targetMove && targetMove == msg.deviceIndexCode) {
		appMap.centerAt(point);
	}
	if($("#img-"+msg.elementId) && msg.elementType == "2003"){
		$("#img-"+msg.elementId).rotate(direction);
	}
		
	if("move-"+selectMove == msg.elementId){
		var src = $("#img-move-"+selectMove).attr("src");
		if(src && src.endWith(".png") && !src.endWith("_hover.png")){
			src = src.substring(0,src.indexOf(".png"))+"_hover.png";
			$("#img-move-"+selectMove).attr("src",src)
		}
	}
	if(msg.elementType == "2003"){
	try{
		planeUpdate(msg);
	}catch(e){}
	}
	//更新移动设备列表信息
	//updateMoveList(msg.elementId, longitude, latitude, speed, direction);
}
//可视域显示初始化
var initVisibleLayer = function (data, mode){
	//data-表示查询资源信息的结果
	//mode-表示初始状态为全部显示，还是全部隐藏，还是根据cookie
	var state = null;
	//是否有图显示
	var show = false;
	if(mode == "all"){
		show = true;
		state="checked";
	}else if(mode == "none"){
		show = false;
		state="checked:false";
	}
	if(data['observation-tower']){
		var check;
		var html = "";
		var towers = data['observation-tower'];
		towers.sort(function(a,b){return a.elementId-b.elementId});
		for(var i=0;i<towers.length;i++){
			var id = towers[i].elementId;
			var name = towers[i].elementName;
			if(state){
				//全部显示或者全部不显示
				check = state;
			}else{
				//根据cookie
				if($.cookie('show_tower_'+id)!=null){
					check = "checked";
					show = true;
				}else{
					check = "checked:false";
				}
			}
			if(check == "checked"){
				mapDraw.doShowVisibleArea(id);
				$.cookie('show_tower_'+id, "1");
			}else{
				mapDraw.doHideVisibleArea(id);
				$.cookie('show_tower_'+id, null);
			}
			html+='<input class="ob-check ny-checkbox"  type="checkbox" id="ny-checkbox-'+id+'" '+check+' data-type="'+id+'"><label for="ny-checkbox-'+id+'" title="'+name+'"><span class="visiable-span">'+name+'</span></label><br>';
		}
		if(show == true){
			$('.fire-map-toolbar .visiable').addClass('visiable-open');
			check = "checked";
		}else{
			$('.fire-map-toolbar .visiable').removeClass('visiable-open');
			check = "checked:false";
		}
		html = '<input class="ob-check ny-checkbox" id="ny-checkbox-all" type="checkbox" '+check +' data-type="all" ><label for="ny-checkbox-all"><span class="visiable-span">全部<span></label><br>'+html;
		$('.visiable-layer-div').html(html);
		var height = (towers.length+1) * 25+5;
		if(height<280){
			$('.visiable-layer-div').css('height', height+'px');
		}
		
		$('.ob-check').click(function(){
			var dataType = $(this).attr('data-type');
			var isChecked = $(this).is(':checked');
			if(dataType=='all'){
				if(isChecked){
					// 显示全部
					$('.ob-check').prop({checked:true});
					mapDraw.doShowAllVisibleArea();
					// 保存cookie
					for(var i=0;i<mapDraw.showVisibleAreaMap.keys.length;i++){
						var key = mapDraw.showVisibleAreaMap.keys[i];
						$.cookie('show_tower_'+key, "1");
					}
					if(generalMode){
						for(var i=0;i<mapDraw.showVisibleAreaMap.keys.length;i++){
							var key = mapDraw.showVisibleAreaMap.keys[i];
							$("#general_view_"+key).css("display", "block");
						}
					}
				}else{
					// 隐藏全部
					$('.ob-check').prop({checked:false});
					// 删除cookie
					mapDraw.doHideAllVisibleArea();
					for(var i=0;i<mapDraw.showVisibleAreaMap.keys.length;i++){
						var key = mapDraw.showVisibleAreaMap.keys[i];
						$.cookie('show_tower_'+key, null);
					}
					if(generalMode){
						for(var i=0;i<mapDraw.showVisibleAreaMap.keys.length;i++){
							var key = mapDraw.showVisibleAreaMap.keys[i];
							$("#general_view_"+key).css("display", "none");
						}
					}
				}
			}else{
				if(isChecked){
					//显示
					mapDraw.doShowVisibleArea(dataType);
					$.cookie('show_tower_'+dataType, "1");
					if(generalMode){
						$("#general_view_"+dataType).css("display", "block");
					}
				}else{
					//隐藏
					mapDraw.doHideVisibleArea(dataType);
					$.cookie('show_tower_'+dataType, null);
					if(generalMode){
						$("#general_view_"+dataType).css("display", "none");
					}
				}
				var isAllChecked = true;
				$('.ob-check[data-type!="all"]').each(function(){
					if(!$(this).is(':checked')){
						isAllChecked =false;
					}
				});
				
				if(isAllChecked){
					$('.ob-check[data-type="all"]').prop({checked:true});
				}else{
					$('.ob-check[data-type="all"]').prop({checked:false});
				}
			}
			//rePolymerize();
		});
	}
	
}
//初始化对应图层中的图标
function initGraphic() {
	var generalMode = (needMapType=="general");
	//获取元素信息
	tk.ajax(
		{
			url:path+"/map!getResources.action",
			data:{
				currentTime: new Date()
			},
			succ:function(data){
				if(data) {
					initGraphicSet(data);
					var options = {
						polymerLevelList : {
					 		0 : 100,
					 		1 : 190,
					 		2 : 140,
					 		3 : 170,
					 		4 : 180,
					 		5 : 170,
					 		6 : 170,
					 		7 : 170,
					 		8 : 160,
					 		9 : 160,
					 		10 : 150,
					 		11 : 120
//					 		12 : 100,
//					 		13 : 100,
//					 		14 : 100,
//					 		15 : 100,
//					 		16: 1
						}, //聚合的缩放层级列表
						elementPolymerLevel:{'observation-tower':9},//瞭望塔达到一定层级后才进行聚合(大于9级不聚合)
						//正常时聚合图标路径  完整路径为 normalpicUrl + "polymer_" + num + ".png"
						//该图标的名称是固定的，.../polymer_n.png,n表示当前聚合数量的位数，例如，100个聚合时，n=3
						normalpicUrl : null, 
						//告警时聚合图标路径 完整路径为 normalpicUrl + "polymer_alarm_" + num + ".png"
						//同上
						alarmPicUrl : null,
						// graphic图片的前缀
						picUrlPrefix : null,
						srFrom : 'EPSG:4326',
						srTo : 'EPSG:900913',
						sourceLayers : graphicLayers,
						dataTable : data,
						map : appMap,
						graphicSet : graphicSet,
						virtualDistance : 0,
						cursor:'default',
						showVisibleArea:true,
						mapDraw: mapDraw,
						generalViewLayer: generalViewLayer, // 全景图的图层
						generalMode: generalMode,
						enterGeneralModeCallBack: enterGeneral,
						exitGeneralModeCallBack: exitGeneral
					};
					//聚合初始化
					polymerize = new HikGIS.Polymerization(options);
					if(globalMapType=="general"){
						mapSwitch("general");
					}
					//第一次聚合需要调用该方法
					polymerize.firstPM();
					//绑定地图事件，在移动或者缩放结束时会进行聚合操作
					polymerize.registerMoveendToMap();
				}
				loader.hide();
			}
		});
	//获取移动元素信息
	tk.ajax(
		{
			url:path+"/map!getMobileResources.action",
			data:{
				currentTime: new Date()
			},
			succ:function(data){
				if(data) {
					var sourceData = filterData(data);
					initMoveDevice(sourceData["move"]);
					mobileSourceData = sourceData["move"];
				}
			}
		});
}

function filterData(data) {
	var filterData = {};
	var moveData = {};
	var otherData = {};
	for(var key in data) {
		//移动设备
		if(moveElementType.in_array(key)) {
			moveData[key] = data[key];
		}else{
			otherData[key] = data[key];
		}
	}
	
	filterData["move"] = moveData;
	filterData["other"] = otherData;
	
	return filterData;
}

function initGraphicSet(data) {
	if(data){
		resourceData = data;
		initVisibleLayer(resourceData, "cookie");
		var towers=data['observation-tower'];
		if(towers){
			for(var i=0;i<towers.length;i++){
				towers[i].cursor = 'pointer';
			}
		}
	}
	graphicSet = {
		dblclick:function(g){
			var geometry=g.geometry;
			appMap.centerAt(geometry);
		},
		click : function(g) {
			if(g.attributes.type=='observation-tower'){
				if(!appMap.isMeasure()){
					showRealtimeVedioByTower(g.attributes.id);
				}
				
			}
			//addOrEditResourceWithTail(g.attributes.id,g.attributes.type, appMap.toScreen(g.geometry));
		},
		propertySet : {
			width : 30,
			height : 30,
			picUrlMode : 'FROMDATA',
			picUrlArg : 'iconPath',
			textArg : 'elementName',
			coordMode : 'NORMAL',//'WKT' 如果是WKT，那么就是WKTArg
			xArg : 'longitude',
			yArg : 'latitude',
			idArg : 'elementId',
			thumbnailview: 'thumbnailview' // 全景图片的地址
		/*,initAngle : 'initAngle',
		   fieldAngle : 'fieldAngle',
		   visualRange : 'visualRange'*/
		}
	};
}
//加载地图
function loadMap() {
	mapContainer = $("#mapContainer");
	layer = getMapLayer("appMap");
	//初始化地图工具配置
	var mapoption = {
		showWatermark:false,
		showScaleLine:false,
		useHikNavigation: false		//使用hik封装的通用地图导航工具	
	};
	appMap = new HikGIS.Map("mapContainer", [layer], mapoption, function() {});
	appMap.zoomToExtent(getInitExtent());
	appMap.initExtent = getInitExtent();
	appMap.events.register('zoomend',appMap,function(){
		//监听zoomend事件，如果appMap>=10级的时候，火情就不显示，避免卡顿现象
		if(fireLayer){
			if(appMap.zoom>=10){
				fireLayer.setVisibility(false);
			}else{
				fireLayer.setVisibility(true);				
			}
		}
		
		
	})
	var level = getMapLevel();
	if(level) {
		appMap.initLevel = parseInt(level);
		appMap.setLevel(parseInt(level));
	}
	//地图使用鹰眼
	//appMap.addOverviewMap();
	
	alarmGraphicLayer= new OpenLayers.Layer.Markers('geo-alarm-result-markers-layer');
	appMap.addLayer(alarmGraphicLayer);
	alarmEventLayer = new OpenLayers.Layer.Markers('geo-alarm-result-markers-layer-2');
	appMap.addLayer(alarmEventLayer);
	
	var pathLayer=new OpenLayers.Layer.Vector('alarm-result-path-layer');
	eventDrawTools =new HikGIS.MapDrawTools(appMap,pathLayer,lineStyle);
	var pathLayer2=new OpenLayers.Layer.Vector('alarm-result-path-layer2');
	cEventDrawTools =new HikGIS.MapDrawTools(appMap,pathLayer2,lineStyle);
	
	
	
	var scaleline = new HikGIS.Scale($("#scale-info")[0]);
	appMap.addControl(scaleline);
//	
	var mousePosition=new OpenLayers.Control.MousePositionEX({numDigits:5,displayProjection: new OpenLayers.Projection("EPSG:4326"),element:$("#mouse-position")[0],prefix:"经度:",separator:",纬度:",suffix:""});

	appMap.addControl(mousePosition);  //获取鼠标的经纬度 
	mapSwitch(needMapType);
	initPlot(appMap);
}


/**
 * 根据元素类型添加元素到对应图层
 * @param elementType
 * @param elementId
 */
function refreshLayerByTypeWithAdd(elementType, data) {
	if(polymerize) {
		polymerize.insertData(elementType, data);
		polymerize.forcedRefresh();
	}
}

function initMapExtent(extent) {
	var extents = extent.split(",");
	var minPoint = new HikGIS.Geometry.Point(parseFloat(extents[0]), parseFloat(extents[1])).transform("EPSG:4326","EPSG:900913");
	var maxPoint = new HikGIS.Geometry.Point(parseFloat(extents[2]), parseFloat(extents[3])).transform("EPSG:4326","EPSG:900913");
	minX = minPoint.x;
	minY = minPoint.y;
	maxX = maxPoint.x;
	maxY = maxPoint.y;
	if(extents.length == 5) {
		mapLevel = parseInt(extents[extents.length-1]);
	}else{
		mapLevel = null;
	}
	if(!appMap) {
		initExtentCallback();
		return;
	}
	appMap.zoomToExtent(getInitExtent());
	appMap.initExtent = getInitExtent();
	appMap.setLevel(mapLevel);
	appMap.initLevel = mapLevel;
}
// 切换地图
function mapSwitch(mapType) {
	$(".map_switcher").each(function(){
		$(this)[0].style.zIndex = 1;
	});
	if(mapType=="satellite") {
		if(globalMapType=="normal") {
			changeSatelliteMap();
		}
		globalMapType = "satellite";
		if(polymerize) {
			generalMode = false;
			polymerize.toggleGeneralMode(false);
		}
		$("#mapSwitcherSatellite")[0].style.zIndex = 10;
		$('.olLayerDiv').css('color','#fff');
		$('.type-element[data-type!="tower"]').show();
		switchRoad();
	} else if(mapType=="general"){
		if(globalMapType=="normal") {
			changeGeneralMap();
		}
		globalMapType = "general";
		if(polymerize) {
			generalMode = true;
			polymerize.toggleGeneralMode(true);
		} else {
			var tryinit = setInterval(function() {
				if(polymerize) {
					clearInterval(tryinit);
					generalMode = true;
					polymerize.toggleGeneralMode(true);
				}
			},100);
		}
		//切换为全景地图，更新缩略图显示状态，先判断mapDraw是否为空
		if(mapDraw){
			// 如果有可视域显示，就保持状态
			if(mapDraw.isShowVisibleArea()){
				for(var i=0;i<mapDraw.showVisibleAreaMap.keys.length;i++){
					var key = mapDraw.showVisibleAreaMap.keys[i];
					if(mapDraw.showVisibleAreaMap.get(key)){
						$("#general_view_"+key).css("display", "block");
					}
				}
			}else{
				// 如果没有图显示，就全部显示
				// mapDraw.doShowAllVisibleArea();
				for(var i=0;i<mapDraw.showVisibleAreaMap.keys.length;i++){
					var key = mapDraw.showVisibleAreaMap.keys[i];
					$("#general_view_"+key).css("display", "block");
				}
				// 更新面板
				initVisibleLayer(resourceData, "all");
			}
		}
		$("#mapSwitcherGeneral")[0].style.zIndex = 10;
		$('.olLayerDiv').css('color','#fff');
		//切换为全景地图，需要隐藏无人机和单兵查询结果
		$('.type-element[data-type!="tower"]').hide();
		$('.type-element[data-type="tower"]').click();
		switchRoad(true);
	}else{
		if(globalMapType!="normal") {
			changeNormalMap();
		}
		globalMapType = "normal";
		if(polymerize) {
			generalMode = false;
			polymerize.toggleGeneralMode(false);
		}
		$("#mapSwitcherNormal")[0].style.zIndex = 10;
		$('.olLayerDiv').css('color','#000');
		$('.type-element[data-type!="tower"]').show();
	} 
}

//地图更换为卫星地图
function changeSatelliteMap(){	
	var lyr = appMap.layers[0];
	var newbaselyr = getSatelliteMapLayer("appMap-satellite");
	appMap.addLayer(newbaselyr);
	appMap.setLayerIndex(newbaselyr, 0);
	appMap.setBaseLayer(newbaselyr);
	appMap.removeLayer(lyr);
	lyr.destroy();
	if(onlineGis == "1"){
		//road layer
		
		var roadLyr = getRoadLayer("gaode-satellite-road");
		appMap.addLayer(roadLyr);
		roadLyr.setOpacity(0);
		appMap.setLayerIndex(roadLyr, 1);
	}
	
}

/**
 * 切换路网
 * @param flag
 */
function switchRoad(flag){
	var roadLyr = appMap.layers[1];
    if(flag){
	roadLyr.setOpacity(0);
	}else{
		
		if($(".satellitecheck").is(':checked')){
			roadLyr.setOpacity(1);
		}else{
			roadLyr.setOpacity(0);
			
		}
	}
	
}

//地图更换为全景模式
function changeGeneralMap(){
	var lyr = appMap.layers[0];
	var newbaselyr = getSatelliteMapLayer("appMap-satellite");
	appMap.addLayer(newbaselyr);
	appMap.setLayerIndex(newbaselyr, 0);
	appMap.setBaseLayer(newbaselyr);
	appMap.removeLayer(lyr);
	lyr.destroy();
	if(onlineGis == "1"){
		//road layer
		var roadLyr = getRoadLayer("gaode-satellite-road");
		appMap.addLayer(roadLyr);
		roadLyr.setOpacity(0);
		appMap.setLayerIndex(roadLyr, 1);
	}
	//mapSwitch("general");
}

//地图更换为普通地图
function changeNormalMap(){
	var lyr = appMap.layers[0];
	var newbaselyr = getMapLayer("appMap");
	appMap.addLayer(newbaselyr);
	appMap.setLayerIndex(newbaselyr, 0);
	appMap.setBaseLayer(newbaselyr);
	appMap.removeLayer(lyr);
	lyr.destroy();
	if(onlineGis == "1"){
		//road layer
		var roadLyr = appMap.layers[1];
		appMap.removeLayer(roadLyr);
		roadLyr.destroy();
	}
	
	
}


var showAlarm = true;
function toggleAlarmContainer(){
	
	showAlarm = !showAlarm;
	
	if(showAlarm){
		$("#alarm-result").show();
		$("#hide-alarm-btn").html("&lt;");
		$("#hide-alarm-container").css("left","303px");
	}else{
		$("#alarm-result").hide();
		$("#hide-alarm-btn").html("&gt;");
		$("#hide-alarm-container").css("left","-1px");
	}
}

/*function imgOpen(imgUrl,eventLogId) {
	var imgUrls = imgUrl.split(",");
    var imgs = [];
    for(var i=0;i<imgUrls.length;i++){
    	imgs.push(imgUrls[i]);
    }
    $.nyGallery({
            imgs: imgs,
            curIndex: $(this).attr("curIndex"),
            width: 630,
            height: 210,
            isSupportAnimate: true
    })
    $('.previewButtonInImg').click(function(){
    	tk.ajax({
			url : 'alarmEvent!getAlarmData.action',
			data : {
				eventLogId : eventLogId
			},
			succ : function(data) {
				showRealtimeVedio(data.eventLog,"historyAlarm");
			}
		});
		
	});
}*/
// 全景图下定时获取当前状态并更新
function getGeneralInfo(){
	tk.ajax(
	{
		url:path+"/map!getResources.action",
		data:{
			currentTime: new Date()
		},
		succ:function(data){
			if(data) {
				var stop = true;
				var towers = data["observation-tower"];
				for(var i = 0, j = towers.length; i < j; i++){
					var id = towers[i].elementId;
					if(towers[i].thumbnailview){
						// 增加元素并更新地址
						$("#general_view_"+id+">.general_view_content>.general_view_none").remove();
						$("#general_view_"+id+">.general_view_content>.general_preview").remove();
						$("#general_view_"+id+">.general_view_content").prepend('<div class="general_view_none"></div><div class="general_preview"></div>');
						$("#general_view_"+id+">.general_view_content>.general_view_control>.general_view_detail").removeAttr("hidden");
						$("#general_view_"+id+">.general_view_content>.general_view_control>.general_view_refresh").attr("title","重新拍摄全景图");
						$("#general_view_"+id+">.general_view_content>.general_preview").css({
							"background":"url("+towers[i].thumbnailview+") no-repeat",
							"background-size":"160px 90px"});
					}else{
						var message = "";
						var hover = "";
						switch (towers[i].existsGeneralview) {
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
							stop = false;
							break;
						case 5:
							message = "正在拼接全景图";
							hover = "正在拼接全景图";
							stop = false;
							break;
						default:
							message = "无全景图";
							hover = "拍摄全景图";
							break;
						}
						// 更新html
						$("#general_view_"+id+">.general_view_content>.general_preview").remove();
						$("#general_view_"+id+">.general_view_content>.general_view_control>.general_view_detail").attr("hidden","hidden");
						$("#general_view_"+id+">.general_view_content>.general_view_none").html(message);
						$("#general_view_"+id+">.general_view_content>.general_view_control>.general_view_refresh").attr("title",hover);
					}
				}
				resourceData = data;
				polymerize.dataTable = data;
				if(stop==true){
					clearInterval(updateGeneralInfo);
				}
			}
		}
	});
}
// 切换到全景模式时的回调函数
var updateGeneralInfo = null;
function enterGeneral() {
	for(var key in mobileSourceData) {
		moveGraphicLayer[key].hide();
	}
	$("#general-refresh-all").show();
	$(".fire-map-toolbar .layer-control").attr("class","toolbar-icon layer-control-disable");
	$(".fire-map-toolbar .tool").attr("class","toolbar-icon tool-disable");
	$('.map-layer-div').hide();
	$('.tool-div').hide();
	// 开启更新
	clearInterval(updateGeneralInfo);
	updateGeneralInfo = setInterval("getGeneralInfo()",2000);
}
// 切换出全景模式的回调函数
function exitGeneral() {
	for(var key in mobileSourceData) {
		moveGraphicLayer[key].show();
	}
	$(".general_view_wrapper").css("display","none");
	$("#general-refresh-all").hide();
	$(".fire-map-toolbar .layer-control-disable").attr("class","toolbar-icon layer-control");
	$(".fire-map-toolbar .tool-disable").attr("class","toolbar-icon tool");
	for(var i=0;i<mapDraw.showVisibleAreaMap.keys.length;i++){
		var key = mapDraw.showVisibleAreaMap.keys[i];
		$("#general_view_"+key).css("display", "none");
	}
	// 结束更新
	clearInterval(updateGeneralInfo);
}

function sendNotify(msg) {
	if(msg.result && msg.result == "1") {
		top.$.tip(msg.resultMsg,{'timeout':3000});
	}
}

function playVoice(){
	if($('.confirm_button').length > 0){
		try{
			if(tk.isIE()){
				var alarmNode=document.getElementById('embed_player');
				alarmNode.Play();
			}else{
				var alarmNode=document.getElementById('audio_player');
				alarmNode.play();
			}
		}catch(e){
			//console.warm("声音播放控件加载失败");
		}
	}
}

function removeAlarmForUpdateStatus(eventLog){
	var eventLogId = eventLog.id;
	var fireLevel = eventLog.fireLevel;
	var status = eventLog.status;
	if(status == 2 || isEmpty(fireLevel)){
		var no = $('.cur-alarm-list').find('#'+eventLogId).attr('no');	
		$('.cur-alarm-list').find('#'+eventLogId).remove();
		destoryFire(eventLogId);
		var count = $(".cur-alarm-info .cur-alarm-card").length;
		if(count>0){
			$('.tab-alarm[data-value="current-alarm"]').html('火灾警报('+count+')');
			if(count>=99){
				$("#alarm-tips").html("99+");
				$("#alarm-tips").attr("num",count);
			}else{
				$("#alarm-tips").html(count);
				$("#alarm-tips").attr("num",count);
			}
		}else{
			$('.tab-alarm[data-value="current-alarm"]').html('火灾警报');
			$("#alarm-tips").hide();
			$("#alarm-tips").attr("num","0");
			$('.cur-alarm-list').html('<div class="grid-nodata" style="display: block;top:0">       <div class="grid-nodata-container" style="left:35%;">           <div class="grid-nodata-tip">没有数据</div>       </div>   </div>');
		}
								
		alarmDatas.splice(no,1);
		alarmDataTypes.splice(no,1);
		imgFlags.splice(no,1);
		
		// 更新告警
		if($('#iframe-content',window.parent.document).siblings('.c-dialog').attr('class')!==undefined && $('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe').length >0 && $('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow != null && $('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow.setParments){
			$('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow.setImgId(no);
			$('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow.setParments(kms,alarmDatas,alarmDataTypes,imgFlags);
		}
		
	}else{
		var $eventLog = $('.cur-alarm-list').find('#'+eventLogId);
		if($eventLog){
			var firdom = $eventLog.find(".item-level");
			if(fireLevel==1){
				firdom.text('一级');
				firdom.css('backgroundColor','#F9A520');	
				firdom.show();		
			}else if(fireLevel==2){
				firdom.text('二级');
				firdom.css('backgroundColor','#F96D20');	
				firdom.show();		
			}else if(fireLevel==3){
				firdom.text('三级');
				firdom.css('backgroundColor','#D92020');
				firdom.show();
			}
			$eventLog.find('.moredeal').show();
			if(mdlFireCommand != 1){
				$eventLog.find('.fireforce').hide();
			}
			$eventLog.find('.confirm_button').removeClass('confirm_button').hide();
			
			var no = $('.cur-alarm-list').find('#'+eventLogId).attr('no');			
			var data = alarmDatas[no];
			data.fireLevel = fireLevel;
			alarmDatas[no] = data;
			// 更新告警
			if($('#iframe-content',window.parent.document).siblings('.c-dialog').attr('class')!==undefined && $('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe').length >0 && $('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow != null && $('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow.setParments){
				$('#iframe-content',window.parent.document).siblings('.c-dialog').find('.dialog-content iframe')[0].contentWindow.setParments(kms,alarmDatas,alarmDataTypes,imgFlags)
			}	
			
		}
	}
}

//测距
function measureLength() {
	$(".img_close").click();
	appMap.measureLength();
}

//测面
function measureArea() {
	$(".img_close").click();
	appMap.measureArea();
}

function measureClearAll(){
	stopAll();
	appMap.clear();
}

/**
 * 停止测试操作
 */
function stopMeasure(){
	appMap.stopMeasure();
}

/**
 * 停止当前页面一切活动
 */
function stopAll(){
	//停止测量操作
	appMap.stopPrint();
	stopMeasure();
	
}

/**IE8自动刷新，防止内存溢出导致页面崩溃 半小时执行一次*/
function IE8AutoRefresh(){
	if(runtimeLength >= 6){
		var oDate = new Date(); //实例一个时间对象；
		var hours = oDate.getHours(); //获取系统时，
		if(hours >=1 || hours <=4){
			$.confirm("检测到当前浏览器为IE8，系统将在30秒后自动刷新页面，点击取消停止刷新！",null,function(){
				runtimeLength = 5;
			});
			setTimeout(topReload,30*1000);
		}else{
			runtimeLength++;
		}
	}else{
		runtimeLength++;
	}
}

function topReload(){
	if(runtimeLength >= 6){
		top.location.reload();
	}else{
		runtimeLength++;
	}
}

function initKms(){
	tk.ajax({
	url:'alarmEvent!getKms.action',
	succ:function(data){
		if(data != null && data.indexOf("kms") > 0){
			kms = data;
		}
	}
    });
}

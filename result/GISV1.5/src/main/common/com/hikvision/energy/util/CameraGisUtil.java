package com.hikvision.energy.util;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.dom4j.Document;
import org.dom4j.DocumentException;
import org.dom4j.DocumentHelper;
import org.dom4j.Element;

import com.hikvision.energy.cache.IResourceCache;
import com.hikvision.energy.service.GisSocketService;
import com.hikvision.energy.task.CameraPtzTask;
import com.hikvision.energy.task.CruiseTaskManager;
import com.hikvision.energy.util.log.LogUtil;
import com.hikvision.energy.util.obj.StringUtils;
import com.hikvision.energy.vo.CameraGisInfoVO;
import com.hikvision.energy.vo.ServiceInfo;
import com.hikvision.energy.wsclient.CommonLicenseUtil;
import com.hikvision.energy.wsclient.VmsSdkService;
import com.hikvision.energy.wsclient.VmsWebSdkService;
import com.hikvision.swdf.core.ServiceLocator;

/**
 * 用于控制摄像机的角度、焦距的工具类
 * @author wanghongkai
 * @datatime 2016年10月21日 下午3:30:27
 */
public class CameraGisUtil {
	
	private static IResourceCache cache;
	private static Map<String, Integer> unavDevMap;
	private static GisSocketService gisSocketService;
	private static Object unAvailableDeviceMonitor = new Object();
	private static Object gisInfoCacheMonitor = new Object();
	
	/**
	 * 获取缓存对象
	 * @author wanghongkai
	 * @datatime 2016年11月23日 下午4:27:47
	 * @return
	 */
	private static IResourceCache getResourceCache() {
		if(cache==null){
			cache = ServiceLocator.findService("resourceCache");
		}
		return cache;
	}
	
	/**
	 * 获取gisSocketService对象
	 * @author wanghongkai
	 * @datatime 2016年11月29日 上午10:33:34
	 * @return
	 */
	private static GisSocketService getGisSocketService() {
		if(gisSocketService==null) {
			gisSocketService = ServiceLocator.findService("gisSocketService");
		}
		return gisSocketService;
	}
	
	@SuppressWarnings("unchecked")
	private static Map<String, Integer> getUnavailableDeviceCache() {
		IResourceCache resourceCache = getResourceCache();
		if(unavDevMap == null) {
			unavDevMap = (Map<String, Integer>) resourceCache.getObject("unAvailableDevMap");
			if(unavDevMap==null) {
				unavDevMap = new ConcurrentHashMap<String, Integer>();
				resourceCache.cacheObject("unAvailableDevMap", unavDevMap);
			}
		}
		return unavDevMap;
	}
	
	/**
	 * 设置目标设备的水平角，俯仰角以及焦距
	 * 
	 * @author wanghongkai
	 * @datatime 2016年10月21日 下午3:32:46
	 * @param cameraIndexCode
	 * @param panPos
	 * @param tiltPos
	 * @param zoomPos
	 */
	public static boolean setPtzPosition(String cameraIndexCode, String panPos,
			String tiltPos, String zoomPos) {
		return setPtzPositionWithSpeed(cameraIndexCode, panPos, tiltPos, zoomPos, 0);
	}
	
	/**
	 * 转动设备时同时设置设备的转动速度，如果不是4.2，仍然调用老接口
	 * @author wanghongkai
	 * @datatime 2016年12月17日 上午11:04:39
	 * @param cameraIndexCode
	 * @param panPos
	 * @param tiltPos
	 * @param zoomPos
	 * @return
	 */
	public static boolean setPtzPositionWithSpeed(String cameraIndexCode, String panPos,
			String tiltPos, String zoomPos, float speed) {
		String token = CruiseTaskManager.getInstance().getToken();
		if(StringUtils.isEmpty(token)) {
			return false;
		}
		String xml = VmsSdkService.setPtzPosition(token, cameraIndexCode, panPos, tiltPos, zoomPos, speed);
		if(StringUtils.isEmpty(xml)) {
			return false;
		}
		if(CommonLicenseUtil.isNewVersion()){
			try {
				Document document = DocumentHelper.parseText(xml);
				Element element = document.getRootElement();
				String message=element.element("head").element("result").attributeValue("message");
				if("success".equals(message)){
					return true;
				}
				
			} catch (DocumentException e) {
				LogUtil.logError(CameraGisUtil.class, e);
			}
			return false;
		}else{
			try {
				Document document = DocumentHelper.parseText(xml);
				Element element = document.getRootElement();
				element = element.element("Pack").element("Result");
				if (element != null && "200".equals(element.attributeValue("id"))) {
					return true;
				}
				return false;
			} catch (DocumentException e) {
				LogUtil.logError(CameraGisUtil.class, "解析设置ptz值返回报文出错！");
				return false;
			}
		}
		
	}
	/**
	 * 获取一个设备的gis信息
	 * 
	 * @author wanghongkai
	 * @datatime 2016年10月21日 下午4:14:56
	 * @param cameraIndexCode
	 * @return
	 */
	@SuppressWarnings("unchecked")
	public static CameraGisInfoVO getCameraGisInfo(String cameraIndexCode) {
		if(StringUtils.isNotEmpty(cameraIndexCode)){
			IResourceCache resourceCache = getResourceCache();
			Map<String, CameraGisInfoVO> cameraGisInfoMap = (Map<String, CameraGisInfoVO>) resourceCache.getObject("cameraGisInfo");
			if(cameraGisInfoMap!=null) {
				return cameraGisInfoMap.get(cameraIndexCode);
			}
		}
		return null;
	}

	/**
	 * 水平旋转一个角度，有个接口叫ptzControl，该接口的说明中写明了“该接口不稳定，不建议使用”，因此不用那个接口
	 * 在增量模式下，短时间内多次调用该接口，增量不叠加，只以最后一次调用时摄像机的角度为基础叠加增量
	 * @author wanghongkai
	 * @datatime 2016年10月22日 上午10:56:57
	 * @param cameraIndexCode
	 * @param angle  旋转的角度，正数为顺时针，负数为逆时针
	 * @param mode	 旋转的模式，0为转到某个角度，1为旋转某个角度,不为0时都按1来处理
	 * @return
	 */
	public static boolean horizontalRotating(String cameraIndexCode, double angle, int mode) {
		String token = CruiseTaskManager.getInstance().getToken();
		if(StringUtils.isEmpty(token)) {
			return false;
		}
		if (mode != 0 && angle == 0) {
			return true;
		}
		if (StringUtils.isEmpty(cameraIndexCode)) {
			return false;
		}
		CameraGisInfoVO cameraGisInfo = getCameraGisInfo(cameraIndexCode);
		if (cameraGisInfo != null) {
			String sNowAngle = cameraGisInfo.getPanPos();
			double nowAngle;
			try {
				nowAngle = Double.parseDouble(sNowAngle);
			} catch (Exception e) {
				LogUtil.logError(CameraGisUtil.class, "转换水平角到double出错！");
				return false;
			}
			double targetAngle = (mode == 0 ? angle % 360 : (nowAngle + angle) % 360);
			if (targetAngle == nowAngle) {
				return true;
			}
			boolean result = setPtzPosition(cameraIndexCode, "" + targetAngle,
					cameraGisInfo.getTiltPos(), cameraGisInfo.getZoomPos());
			return result;
		}
		return false;
	}

	/**
	 * 垂直旋转一个角度，有个接口叫ptzControl，该接口的说明中写明了“该接口不稳定，不建议使用”，因此不用那个接口
	 * 在增量模式下，短时间内多次调用该接口，增量不叠加，只以最后一次调用时摄像机的角度为基础叠加增量
	 * @author wanghongkai
	 * @datatime 2016年10月22日 下午14:42:23
	 * @param cameraIndexCode
	 * @param angle  旋转的角度，正数为顺时针，负数为逆时针
	 * @param mode	 旋转的模式，0为转到某个角度，1为旋转某个角度,不为0时都按1来处理
	 * @return
	 */
	public static boolean verticalRotating(String cameraIndexCode, double angle, int mode) {
		if (mode != 0 && angle == 0) {
			return true;
		}
		if (StringUtils.isEmpty(cameraIndexCode)) {
			return false;
		}
		CameraGisInfoVO cameraGisInfo = getCameraGisInfo(cameraIndexCode);
		if (cameraGisInfo != null) {
			String sNowAngle = cameraGisInfo.getTiltPos();
			double nowAngle;
			try {
				nowAngle = Double.parseDouble(sNowAngle);
			} catch (Exception e) {
				LogUtil.logError(CameraGisUtil.class, "转换俯仰角到double出错！");
				return false;
			}
			double targetAngle = (mode == 0 ? angle % 360 : (nowAngle + angle) % 360);
			if (targetAngle == nowAngle) {
				return true;
			}
			boolean result = setPtzPosition(cameraIndexCode,cameraGisInfo.getPanPos(),
					""+targetAngle, cameraGisInfo.getZoomPos());
			return result;
		}
		return false;
	}

	/**
	 * 设置摄像机的焦距值（z值）
	 * @author wanghongkai
	 * @datatime 2016年10月22日 下午3:24:58
	 * @param cameraIndexCode
	 * @param zoomVaule			缩放以后的z值
	 * @return
	 */
	public static boolean zoom(String cameraIndexCode, String zoomVaule) {
		CameraGisInfoVO cameraGisInfo = getCameraGisInfo(cameraIndexCode);
		if (cameraGisInfo != null) {
			boolean result = setPtzPosition(cameraIndexCode,cameraGisInfo.getPanPos(),
					cameraGisInfo.getTiltPos(), zoomVaule);
			return result;
		}
		return false;
	}
	
	/**
	 * 获取抓图的url
	 * @author wanghongkai
	 * @datatime 2016年10月24日 下午2:42:08
	 * @param cameraIndexCode
	 * @return
	 */
	public static String capturePicture(String cameraIndexCode) {
		String url = null;
		if(CommonLicenseUtil.isNewVersion()) {

			url = VmsWebSdkService.capturePicture(cameraIndexCode);

			ServiceInfo kms = getService(Constant.SERVICE_TYPE_KMS);
			// wangtao34
			if(kms != null){
				url = "http://"+kms.getIp()+":"+kms.getPort()+"/kms/services/rest/dataInfoService/getImage?id="+url.substring(url.indexOf("id=") + 3);
			}
//			LogUtil.logError(CameraGisUtil.class,url);
		} else {
			String xml = VmsSdkService.capturePicture(cameraIndexCode);
			if(StringUtils.isNotEmpty(xml)) {
				try{
					Document document = DocumentHelper.parseText(xml);
					Element root = document.getRootElement();
					Element element = root.element("head").element("result");
					String resultCode = element.attributeValue("result_code");
					if("0".equals(resultCode)) {
						element = root.element("rows").element("row");
						url = element.attributeValue("pic_url");
					} else {
						LogUtil.logError(CameraGisUtil.class, "调用接口抓图失败！");
					}
				} catch(Exception e) {
					LogUtil.logError(CameraGisUtil.class, "解析抓图地址出错！");
				}
			}
		}
		return url;
	}
	
	/**
	 * 
	* @Title: getService 
	* @Description: 获取服务信息 
	* @param @param serviceType
	* @param @return    设定文件 
	* @return ServiceInfo    返回类型 
	* @throws
	 */
	private static ServiceInfo getService(int serviceType){
		ServiceInfo vmsInfo = null;
		String ip = CfgMgr.getCmsIp();
		Long netZoneId = VmsSdkService.getNetZoneId(ip, serviceType);
		netZoneId = netZoneId == null? Long.valueOf(0) : netZoneId;
		List<ServiceInfo> kmsInfos =null;
		try{
			kmsInfos = VmsSdkService.getServiceByType(serviceType, netZoneId);
		if(kmsInfos != null){
		   vmsInfo = kmsInfos.get(0);
		}
		}catch(Exception e){
			LogUtil.logError(CameraGisUtil.class, e);
		}
		return vmsInfo;
	}
	
	/**
	 * 设置摄像机转到某个位置或缩放到某个焦距值，调用后会阻塞直到到达所在位置或者超过调用次数为止
	 * 
	 * @author wanghongkai
	 * @datatime 2016年10月24日 下午4:52:51
	 * @param cameraIndexCode
	 * @param panPos
	 * @param tiltPos
	 * @param zoomPos
	 * @param firstMillis 	第一次等待的时间，毫秒
	 * @param loopMillis  	当第一次等待结束没有到指定位置时，循环等待的间隔时间
	 * @return 成功转到，返回TRUE，异常或者超时，返回false
	 */
	
	public static boolean rotateAndComfirm(String cameraIndexCode, float panPos,
			float tiltPos, float zoomPos, long firstMillis, long loopMillis){
		return rotateAndComfirm(cameraIndexCode, panPos, tiltPos, zoomPos, firstMillis, loopMillis, 10, 0);
	}
	
	public static boolean rotateAndComfirm(String cameraIndexCode, float panPos,
			float tiltPos, float zoomPos, long firstMillis, long loopMillis,int loopTime){
		return rotateAndComfirm(cameraIndexCode, panPos, tiltPos, zoomPos, firstMillis, loopMillis, loopTime, 0);
	}
	
	public static boolean rotateAndComfirm(String cameraIndexCode, float panPos,
			float tiltPos, float zoomPos, long firstMillis, long loopMillis,int loopTime, float speed) {
		CameraGisUtil.setPtzPositionWithSpeed(cameraIndexCode, ""+panPos, ""+tiltPos, ""+zoomPos, speed);
		try {
			Thread.sleep(firstMillis);
		} catch (InterruptedException e) {
			LogUtil.logError(CameraPtzTask.class, "rotateAndComfirm: sleep"+firstMillis+"秒被中止！");
			return false;
		}
		try{
			int times = loopTime; // 设定等待的最大次数，避免摄像机因为未知原因无法转动到指定位置而死循环
			// 每隔loopMillis秒检查摄像机是否转到了指定位置
			while (true) {
				if (times-- == 0) {
					return false;
				}
				CameraGisInfoVO gisInfo = VmsWebSdkService.getPtzPosition(CruiseTaskManager.getInstance().getToken(), cameraIndexCode);
				if(gisInfo==null) {
					continue;
				}
				float nowPanPos; 
				float nowTitlePos;
				float nowZoomPos;
				try {
					nowPanPos = Float.parseFloat(gisInfo.getPanPos());
					nowTitlePos = Float.parseFloat(gisInfo.getTiltPos());
					nowZoomPos = Float.parseFloat(gisInfo.getZoomPos());
				} catch(Exception e) {
					LogUtil.logError(CameraPtzTask.class, "rotateAndComfirm: 将获取到的ptz值转化为float时出错！");
					return false;
				}
				if (Math.abs(panPos - nowPanPos) < 0.5
						&& Math.abs(tiltPos - nowTitlePos) < 0.5 && Math.abs(zoomPos - nowZoomPos) < 0.5) {
					return true;
				}
				CameraGisUtil.setPtzPositionWithSpeed(cameraIndexCode, ""+panPos, ""+tiltPos, ""+zoomPos, speed);
				try {
					Thread.sleep(loopMillis);
				} catch (InterruptedException e) {
					LogUtil.logError(CameraPtzTask.class, "rotateAndComfirm: sleep"+loopMillis+"秒被中止！");
					return false;
				}
			}
		}catch(Exception e){
			LogUtil.logError(CameraPtzTask.class, "调用设备接口失败");
			return false;
		}
		
	}
	
	/**
	 * 获得一个摄像机的控制权限
	 * @author wanghongkai
	 * @datatime 2016年10月26日 上午11:32:39
	 * @param cameraIndexCode
	 * @param time
	 * @return
	 */
	public static boolean lockCamera(String cameraIndexCode, int time) {
		GisSocketService gisSocketService = getGisSocketService();
		if(gisSocketService.lockDeviceByCamera(cameraIndexCode, "200", ""+time)==0) {
			return true;
		}
		return false;
	}
	
	/**
	 * 取消对一个摄像机的控制权限
	 * @author wanghongkai
	 * @datatime 2016年10月26日 上午11:32:39
	 * @param cameraIndexCode
	 * @param
	 * @return
	 */
	public static boolean unlockCamera(String cameraIndexCode) {
		GisSocketService gisSocketService = getGisSocketService();
		if(gisSocketService.lockDeviceByCamera(cameraIndexCode, "201", "1")==0) {
			return true;
		}
		return false;
	}
	
	/**
	 * 根据camera的indexcode获取单个ptz信息以及ptz的范围信息
	 * @author wanghongkai
	 * @datatime 2016年11月4日 上午9:26:49
	 * @param cameraIndexCode
	 * @return
	 */
	public static CameraGisInfoVO getCameraPtzInfo(String cameraIndexCode) {
		
		String token = CruiseTaskManager.getInstance().getToken();
		if(StringUtils.isEmpty(token)){
			return null;
		}
		return VmsWebSdkService.getPtzPosition(token, cameraIndexCode);
	}
	
	/**
	 * 根据camera的indexcode列表获取设备的ptz信息以及ptz的范围信息
	 * @author wanghongkai
	 * @datatime 2016年10月26日 下午2:03:23
	 * @param
	 * @return
	 */
	@SuppressWarnings("unchecked")
	public static List<CameraGisInfoVO> getCameraPtzInfoList(String[] cameraIndexCodes) {
		String token = CruiseTaskManager.getInstance().getToken();
		if(StringUtils.isEmpty(token)) {
			return null;
		}
		// 第一个接口获取水平角和俯仰角
		String xml = VmsSdkService.getPtzPoition(token, cameraIndexCodes);
		if(StringUtils.isEmpty(xml)) {
			return null;
		}
		List<CameraGisInfoVO> gisInfoList = new ArrayList<CameraGisInfoVO>();
		try {
			Document document = DocumentHelper.parseText(xml);
			Element root = document.getRootElement();
			String resultCode = root.element("head").element("result").attributeValue("result_code");
			if(!"0".equals(resultCode)) {
				return null;
			}
			List<Element> elementList = root.element("rows").elements("row");
			for(Element row:elementList) {
				CameraGisInfoVO cameraGisInfo = null;
				String content = row.attributeValue("result");
				document = DocumentHelper.parseText(content);
				Element element = document.getRootElement().element("Pack");
				String result = element.element("Result").attributeValue("id");
				if ("200".equals(result)) {
					element = element.element("Params");
					String panPos = element.element("PanPos").getStringValue();
					String tiltPos = element.element("TiltPos").getStringValue();
					String zoomPos = element.element("ZoomPos").getStringValue();
					String panPosMax = element.element("PanPosMax").getStringValue();
					String tiltPosMax = element.element("TiltPosMax").getStringValue();
					String zoomPosMax = element.element("ZoomPosMax").getStringValue();
					String panPosMin = element.element("PanPosMin").getStringValue();
					String tiltPosMin = element.element("TiltPosMin").getStringValue();
					String zoomPosMin = element.element("ZoomPosMin").getStringValue();
					cameraGisInfo = new CameraGisInfoVO(row.attributeValue("cameraindexcode"), panPos, tiltPos, zoomPos,
						panPosMax, tiltPosMax, zoomPosMax, panPosMin, tiltPosMin, zoomPosMin);
					gisInfoList.add(cameraGisInfo);
				}
			}
		} catch (Exception e) {
			LogUtil.logError(CameraGisUtil.class, "getCameraPtzInfo:解析水平角俯仰角等信息时出错！");
			return null;
		}
		return gisInfoList;
	}
	
	/**
	 * 获取设备是否可用,连续两次获取不到hvptz信息则认为不可用
	 * @author wanghongkai
	 * @datatime 2016年11月23日 下午4:25:55
	 * @param deviceIndexCode
	 * @return
	 */
	public static boolean isDeviceAvailable(String deviceIndexCode) {
		synchronized (unAvailableDeviceMonitor) {
	    	Map<String,Integer> cacheMap = getUnavailableDeviceCache();
			// 设备在不可用列表中，则不去查询该设备的信息
			if(cacheMap!=null&&cacheMap.keySet().contains(deviceIndexCode)) {
				// 连续累计两次以上，则不进行查询
				if(cacheMap.get(deviceIndexCode)>2) {
					return false;
				}
			}
			return true;
		}
	}
	/**
	 * 某个设备不可用时，为其增加不可用次数
	 * @author wanghongkai
	 * @datatime 2016年11月23日 下午4:31:37
	 * @param deviceIndexCode
	 */
	public static int setDeviceUnAvailable(String deviceIndexCode) {
		synchronized (unAvailableDeviceMonitor) {
	    	Map<String,Integer> cacheMap = getUnavailableDeviceCache();
	    	Integer times = cacheMap.get(deviceIndexCode);
	    	if(times==null) {
	    		times=1;
	    	} else {
	    		times++;
	    	}
	    	cacheMap.put(deviceIndexCode, times);
	    	return times;
		}
	}
	
	
	/**
	 * 将某个设备移出不可用列表
	 * @author wanghongkai
	 * @datatime 2016年11月23日 下午4:40:08
	 * @param deviceIndexCode
	 */
	public static void setDeviceAvailable(String deviceIndexCode) {
		synchronized (unAvailableDeviceMonitor) {
	    	Map<String,Integer> cacheMap = getUnavailableDeviceCache();
			if (cacheMap.keySet().contains(deviceIndexCode)) {
				cacheMap.remove(deviceIndexCode);
			}
		}
	}
	
	/**
	 * 初始化不可用设备列表
	 * @author wanghongkai
	 * @datatime 2016年11月28日 下午2:48:57
	 */
	public static void initUnAvailableMap() {
		synchronized (unAvailableDeviceMonitor) {
	    	Map<String,Integer> cacheMap = getUnavailableDeviceCache();
	    	if(cacheMap != null) {
				cacheMap.clear();
			}
		}
	}
	
	/**
	 * 缓存gisInfo数据
	 * @author wanghongkai
	 * @datatime 2016年11月28日 下午3:00:26
	 * @param cameraGisInfoMap
	 */
	public static void cacheGisInfo(Map<String, CameraGisInfoVO> cameraGisInfoMap) {
		synchronized (gisInfoCacheMonitor) {
			IResourceCache resourceCache = getResourceCache();
	    	resourceCache.cacheObject("cameraGisInfo", cameraGisInfoMap);
		}
	}
	
	/**
	 * 从缓存中获取gisInfo数据
	 * @author wanghongkai
	 * @datatime 2016年11月28日 下午3:00:45
	 * @return
	 */
	@SuppressWarnings("unchecked")
	public static Map<String, CameraGisInfoVO> getGisInfoFromCache() {
		synchronized (gisInfoCacheMonitor) {
			IResourceCache resourceCache = getResourceCache();
	    	return (Map<String, CameraGisInfoVO>) resourceCache.getObject("cameraGisInfo");
		}
	}

	/**
	 * 判断缓存中是否包含某个摄像机的信息
	 * @author wanghongkai
	 * @datatime 2016年11月28日 下午3:11:29
	 * @param cameraIndexCode
	 * @return
	 */
	@SuppressWarnings("unchecked")
	public static boolean isGisInfoExist(String cameraIndexCode) {
		synchronized (gisInfoCacheMonitor) {
			IResourceCache resourceCache = getResourceCache();
			Map<String, CameraGisInfoVO> cacheMap =  (Map<String, CameraGisInfoVO>) resourceCache.getObject("cameraGisInfo");
			if(cacheMap!=null&&cacheMap.containsKey(cameraIndexCode)) {
				return true;
			}
			return false;
		}
	}
	
	/**
	 * 获取gis信息，不同的98平台采用不同的方法
	 * @author wanghongkai
	 * @datatime 2016年12月6日 下午4:36:53
	 * @param deviceIndexCode
	 * @param channelNo
	 * @param cameraIndexCode
	 * @return
	 */
	public static CameraGisInfoVO getGisInfo(String deviceIndexCode,String channelNo, String cameraIndexCode) {
//		if(CommonLicenseUtil.isNewVersion()) {
			return VmsWebSdkService.getGisInfo(deviceIndexCode,cameraIndexCode);
//		} else {
//			return getGisSocketService().getGisInfo_DontUseAlone(deviceIndexCode, channelNo);
//		}
	}
}

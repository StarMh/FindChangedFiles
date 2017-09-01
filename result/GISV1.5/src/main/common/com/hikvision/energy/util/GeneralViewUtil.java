package com.hikvision.energy.util;

import java.awt.Point;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPFile;
import org.apache.commons.net.ftp.FTPReply;
import org.dom4j.Document;
import org.dom4j.Element;
import org.dom4j.io.SAXReader;

import com.hikvision.energy.util.log.LogUtil;
import com.hikvision.energy.util.obj.StringUtils;
import com.hikvision.energy.vo.PanoramaCaptureParam;
import com.hikvision.energy.wsclient.CommonLicenseUtil;
import com.ivms6.core.util.FileUtils;

/**
 * 全景图中需要用到的功能
 * 
 * @author wangtao34
 * @time 2017年7月31日 下午6:54:06
 */
public class GeneralViewUtil {
	// 修正视场角时匹配极限距离（100~150），严重影响耗时，平方正比
	private static int VIEW_FIELD_MOVE_MAX = 120;
	// 修正旋转角度时匹配极限距离
	private static int ROTATE_MOVE_MAX = VIEW_FIELD_MOVE_MAX / 2;
	// 调整像素步长，平方与耗时呈反比，严重影响耗时（1~5）
	private static int PIXEL_STEP = 5;
	// 图片匹配取样宽度(最好是10的倍数)，与耗时成正比（50~100）
	private static int MATCH_WIDTH = 50;
	// 亮度调整边缘宽度，与耗时成正比（50~100）
	private static int BRIGHT_WIDTH = 100;
	// 模糊边界宽度（小于等于亮度调整边缘宽度）
	private static int BLUR_WIDTH = 50;

	// 生成ie8下查看的图片的面积
	private static int SAMLL_IMG_AREA = 1920 * 1080;
	// 生成缩略图大小
	private static int THUMBNAIL_IMG_WIDTH = 239;
	private static int THUMBNAIL_IMG_HEIGHT = 158;
	// 压缩后图片高度
	private static int FINAL_HEIGHT = 1080;
	
	/**
	 * 生成全景图
	 * 
	 * @author wangtao34
	 * @time 2017年7月12日 下午2:54:06
	 * @param basePath
	 * @param towerId
	 * @param picCount
	 * @param circleCount
	 * @param horValue
	 * @param verValue
	 * @param horAngle
	 * @param startVerAngle
	 * @param verAngle
	 * @return
	 */
	public static boolean generatePanoramaNew(String basePath, int towerId, int picCount, int circleCount,
			double horValue, double verValue, double horAngle, double startVerAngle, double verAngle) {
		try {
			Thread.sleep(5000);
		} catch (InterruptedException e1) {
			// TODO Auto-generated catch block
			e1.printStackTrace();
		}
		String destPath = CommonFun.getWebRootPath() + "/generalview/images/" + towerId;
		// 大图保存路径
		String destBigImg = destPath + ".jpg";
		// 小图（ie8）保存路径
		String destSmallImg = destPath + "_small.jpg";
		// 缩略图保存路径
		String destThumbnailImg = destPath + "_thumbnail.jpg";

		if (circleCount <= 0 || picCount <= 0) {
			return false;
		} else if (picCount == 1 && circleCount == 1) {
			// 只有一张图片，不需要拼接，直接变换原图
			try {
				BufferedImage firstImage = ImageIO.read(new File(basePath + "/src1/1.jpg"));
				ImageIO.write(firstImage, "JPEG", new File(destBigImg));
			} catch (IOException e) {
				LogUtil.logError(GeneralViewUtil.class, "第一张图读写失败");
				return false;
			}
			// 如果缩略图和小图生成失败，仍旧返回true，拼接成功
			generateSmall(destBigImg, destSmallImg, SAMLL_IMG_AREA);
			generateThumbnail(destBigImg, destThumbnailImg, THUMBNAIL_IMG_WIDTH, THUMBNAIL_IMG_HEIGHT);
			generateFinal(destBigImg, destBigImg, FINAL_HEIGHT);
		} else {
			// 多张图片，需要拼接，即使读取不到文件，也不终止，而用无效图代替
			// 读取文件
			BufferedImageCut[][] allImages = new BufferedImageCut[circleCount][picCount];
			for (int i = 0; i < circleCount; i++) {
				String rawPath = basePath + "/src" + (i + 1);
				for (int j = 0; j < picCount; j++) {
					try {
						allImages[i][j] = new BufferedImageCut(ImageIO.read(new File(rawPath, (j + 1) + ".jpg")));
					} catch (IOException e) {
						// 读取文件失败，建立一张无效图
						LogUtil.logError(GeneralViewUtil.class, "读取第" + i + "行第" + j + "列" + "文件失败，用无效图代替");
						allImages[i][j] = new BufferedImageCut(new BufferedImage(1, 1, 5), false);
					}
				}
			}
			BufferedImage result = stitchAllFast(allImages, picCount, circleCount, horValue, verValue, horAngle,
					startVerAngle, verAngle);
			if (result == null) {
				return false;
			}
			try {
				ImageIO.write(result, "JPEG", new File(destBigImg));
			} catch (IOException e) {
				LogUtil.logError(GeneralViewUtil.class, "拼接结果图保存失败：" + destBigImg);
				return false;
			}
			// 如果缩略图和小图生成失败，仍旧返回true，拼接成功
			generateSmall(destBigImg, destSmallImg, SAMLL_IMG_AREA);
			generateThumbnail(destBigImg, destThumbnailImg, THUMBNAIL_IMG_WIDTH, THUMBNAIL_IMG_HEIGHT);
			generateFinal(destBigImg, destBigImg, FINAL_HEIGHT);
		}
		try {
			FileUtils.deleteDirectory(new File(basePath));
		} catch (IOException e) {
			LogUtil.logError(GeneralViewUtil.class, "清除拍摄临时文件时遇到错误");
		}
		return true;
	}

	/**
	 * 快速拼接算法
	 * 
	 * @author wangtao34
	 * @time 2017年7月13日 上午11:18:11
	 * @param allImages
	 * @param picCount
	 * @param circleCount
	 * @param horValue
	 * @param verValue
	 * @param horAngle
	 * @param startVerAngle
	 * @param verAngle
	 * @return
	 */
	private static BufferedImage stitchAllFast(BufferedImageCut[][] imgs, int picCount, int circleCount,
			double horValue, double verValue, double horAngle, double startVerAngle, double verAngle) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return null;
		}
		double rotateAngle = 0;
		boolean succeed = false;
		// 1.初次虚拟裁剪操作
		succeed = invisibleCut(imgs, horValue, verValue, horAngle, startVerAngle, verAngle);
		if (!succeed) {
			return null;
		}

		// 2.修正视场角参数，并重新裁剪
		// 迭代次数，取2~3即可
		int times = 2;
		modifyParamAndCut(imgs, horValue, verValue, horAngle, startVerAngle, verAngle, times);

		// 3.计算旋转参量，并旋转
		times = 2;
		rotateAngle = calRotateParamAndRotate(imgs, times);

		// 4.扩展有效区域
		extendCut(imgs, rotateAngle);

		// 5.调整亮度
		adjustBrightBL(imgs);
		adjustBrightTLBR(imgs);

		// 6.边界模糊处理
		blurHor(imgs);
		blurVer(imgs);

		// 7.拼接所有图片
		BufferedImage result = stitchAllImages(imgs);
		return result;
	}

	/**
	 * 虚拟裁剪操作，一次性裁剪好所有图片，只标记裁剪矩形的起点（左上）和宽高
	 * 
	 * @author wangtao34
	 * @time 2017年7月13日 上午11:37:39
	 * @param imgs
	 * @param horValue
	 * @param verValue
	 * @param horAngle
	 * @param startVerAngle
	 * @param verAngle
	 * @return
	 */
	private static boolean invisibleCut(BufferedImageCut[][] imgs, double horValue, double verValue, double horAngle,
			double startVerAngle, double verAngle) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return false;
		}
		// 水平方向裁剪

		// 水平方向每张图片有效区域占比
		double effRatioH = horAngle / horValue;
		if (!isValid(effRatioH)) {
			return false;
		}
		// 保证裁剪后每张图宽度一致，寻找第一张有效图的宽度
		int width = 0;
		if (imgs[0][0].isValid()) {
			width = (int) (imgs[0][0].getImg().getWidth() * effRatioH);
		}
		int y = 0;// 裁剪后左上角初始纵坐标
		for (int i = 0; i < imgs.length; i++) {
			for (int j = 0; j < imgs[i].length; j++) {
				if (!imgs[i][j].isValid()) {// 是一张无效图，不裁剪
					continue;
				}
				if (width <= 0) {// 只有在width未赋有效值时，才计算width
					width = (int) (imgs[i][j].getImg().getWidth() * effRatioH);// 裁剪后宽度
				}
				int x = (int) (imgs[i][j].getImg().getWidth() / 2 * (1 - effRatioH));// 裁剪后左上角初始横坐标
				int height = imgs[i][j].getImg().getHeight();// 裁剪后高度
				imgs[i][j].cut(width, height, x, y);
			}
		}

		// 竖直方向裁剪
		// 竖直方向每张图片有效区域占比
		double effRatioV = verAngle / verValue;
		if (!isValid(effRatioV)) {
			return false;
		}
		// 中间图只保留有效区域
		// 保证裁剪后每一行高度一致
		for (int i = 0; i < imgs.length; i++) {
			int height = 0;
			if (imgs[i][0].isValid()) {
				height = (int) (imgs[i][0].getImg().getHeight() * effRatioV);
			}
			for (int j = 0; j < imgs[i].length; j++) {
				if (!imgs[i][j].isValid()) {
					continue;
				}
				if (height <= 0) {
					height = (int) (imgs[i][j].getImg().getHeight() * effRatioV);
				}
				width = imgs[i][j].getWidth();
				y = (int) (imgs[i][j].getImg().getHeight() / 2 * (1 - effRatioV));
				imgs[i][j].cut(width, height, imgs[i][j].getPointX(), y);
			}
		}
		return true;
	}

	/**
	 * 扩展边缘裁剪区域
	 * 
	 * @author wangtao34
	 * @time 2017年7月31日 下午7:09:21
	 * @param imgs
	 * @param angle
	 */
	private static void extendCut(BufferedImageCut[][] imgs, double angle) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return;
		}
		// 获取原图高度宽度
		int imgHeight = 1;
		int imgWidth = 1;
		boolean keep = true;// 跳出外循环标记
		for (int i = 0; i < imgs.length && keep; i++) {
			for (int j = 0; j < imgs[i].length; j++) {
				if (imgs[i][j].isValid()) {
					imgHeight = imgs[i][j].getImg().getHeight();
					imgWidth = imgs[i][j].getImg().getWidth();
					keep = false;
					break;
				}
			}
		}
		// 求因为图片旋转而造成的黑边最大宽度
		int angleDeltX = (int) (Math.tan(Math.toRadians(angle)) * imgHeight) + 1;
		int angleDeltY = (int) (Math.tan(Math.toRadians(angle)) * imgWidth) + 1;

		int i, j, mindelt;
		// left
		j = 0;
		mindelt = 1000000;// 表示最小扩展像素值
		for (i = 0; i < imgs.length; i++) {
			if (!imgs[i][j].isValid()) {
				continue;
			}
			int delt = imgs[i][j].getPointX();
			if (mindelt > delt) {
				mindelt = delt;
			}
		}
		if (mindelt != 1000000) {
			mindelt -= angleDeltX;// 减去黑边宽度
			for (i = 0; i < imgs.length; i++) {
				if (!imgs[i][j].isValid()) {
					continue;
				}
				imgs[i][j].setWidth(imgs[i][j].getWidth() + mindelt);
				imgs[i][j].setPointX(imgs[i][j].getPointX() - mindelt);
			}
		}
		// right
		j = imgs[0].length - 1;
		mindelt = 1000000;
		for (i = 0; i < imgs.length; i++) {
			if (!imgs[i][j].isValid()) {
				continue;
			}
			int delt = imgs[i][j].getImg().getWidth() - imgs[i][j].getPointX() - imgs[i][j].getWidth();
			if (mindelt > delt) {
				mindelt = delt;
			}
		}
		if (mindelt != 1000000) {
			mindelt -= angleDeltX;
			for (i = 0; i < imgs.length; i++) {
				if (!imgs[i][j].isValid()) {
					continue;
				}
				imgs[i][j].setWidth(imgs[i][j].getWidth() + mindelt);
			}
		}
		// top
		i = imgs.length - 1;
		mindelt = 1000000;
		for (j = 0; j < imgs[i].length; j++) {
			if (!imgs[i][j].isValid()) {
				continue;
			}
			int delt = imgs[i][j].getPointY();
			if (mindelt > delt) {
				mindelt = delt;
			}
		}
		if (mindelt != 1000000) {
			mindelt -= angleDeltY;
			for (j = 0; j < imgs[i].length; j++) {
				if (!imgs[i][j].isValid()) {
					continue;
				}
				imgs[i][j].setHeight(imgs[i][j].getHeight() + mindelt);
				imgs[i][j].setPointY(imgs[i][j].getPointY() - mindelt);
			}
		}
		// bottom
		i = 0;
		mindelt = 1000000;
		for (j = 0; j < imgs[i].length; j++) {
			if (!imgs[i][j].isValid()) {
				continue;
			}
			int delt = imgs[i][j].getImg().getHeight() - imgs[i][j].getPointY() - imgs[i][j].getHeight();
			if (mindelt > delt)
				mindelt = delt;
		}
		if (mindelt != 1000000) {
			mindelt -= angleDeltY;
			for (j = 0; j < imgs[i].length; j++) {
				if (!imgs[i][j].isValid()) {
					continue;
				}
				imgs[i][j].setHeight(imgs[i][j].getHeight() + mindelt);
			}
		}

	}

	/**
	 * 修正视场角并重新裁剪
	 * 
	 * @author wangtao34
	 * @time 2017年7月31日 下午7:11:34
	 * @param imgs
	 * @param horValue
	 * @param verValue
	 * @param horAngle
	 * @param startVerAngle
	 * @param verAngle
	 * @param count
	 *            迭代次数，一般取2即可
	 */
	private static void modifyParamAndCut(BufferedImageCut[][] imgs, double horValue, double verValue, double horAngle,
			double startVerAngle, double verAngle, int count) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return;
		}
		// 获取原图高度宽度
		int imgHeight = 1;
		int imgWidth = 1;
		boolean keep = true;// 跳出外循环标记
		for (int i = 0; i < imgs.length && keep; i++) {
			for (int j = 0; j < imgs[i].length; j++) {
				if (imgs[i][j].isValid()) {
					imgHeight = imgs[i][j].getImg().getHeight();
					imgWidth = imgs[i][j].getImg().getWidth();
					keep = false;
					break;
				}
			}
		}
		// 调整行对齐，从左往右对齐
		// 存储所有匹配成功的参数，目标图相对于原图的水平位移
		ArrayList<Integer> deltXs = new ArrayList<Integer>();
		for (int i = 0; i < imgs.length; i++) {
			for (int j = 1; j < imgs[i].length; j++) {
				Point delt = ImageUtils.match(imgs[i][j - 1], imgs[i][j], VIEW_FIELD_MOVE_MAX, MATCH_WIDTH, PIXEL_STEP,
						ImageUtils.LR);
				if (delt != null) {
					deltXs.add(delt.x);
				}
			}
		}
		// 每张图有效区域宽度缩小多少像素
		int dw = 0;
		int maxCount = 10; // 求平均值的最大迭代次数
		dw = ImageUtils.calAverage(deltXs, 0, VIEW_FIELD_MOVE_MAX / 3, maxCount, true);
		// 原来的有效宽度
		double we = horAngle * imgWidth / horValue;
		// 水平视场角放大比例
		double kw = we / (we - dw);

		// 竖直方向对齐
		ArrayList<Integer> deltYs = new ArrayList<Integer>();
		for (int j = 0; j < imgs[0].length; j += 1) {
			for (int i = 1; i < imgs.length; i++) {
				Point delt = ImageUtils.match(imgs[i - 1][j], imgs[i][j], VIEW_FIELD_MOVE_MAX, MATCH_WIDTH, PIXEL_STEP,
						ImageUtils.BT);
				if (delt != null) {
					deltYs.add(delt.y);
				}
			}
		}
		int dh = ImageUtils.calAverage(deltYs, 0, VIEW_FIELD_MOVE_MAX / 3, maxCount, true);
		dh = -dh;// 扩展方向和坐标方向反向
		double he = verAngle * imgHeight / verValue;
		double kh = he / (he - dh);

		boolean succeed = invisibleCut(imgs, horValue * kw, verValue * kh, horAngle, startVerAngle, verAngle);
		// 如果裁剪不成功，直接返回，不再尝试
		if (!succeed) {
			return;
		}
		// 达到迭代次数
		if (count == 1) {
			return;
		}
		modifyParamAndCut(imgs, horValue * kw, verValue * kh, horAngle, startVerAngle, verAngle, count - 1);
	}

	/**
	 * 计算旋转参数并旋转
	 * 
	 * @author wangtao34
	 * @time 2017年7月31日 下午4:18:09
	 * @param imgs
	 * @param count
	 *            迭代次数，一般取1或2即可
	 * @return
	 */
	private static double calRotateParamAndRotate(BufferedImageCut[][] imgs, int count) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return 0;
		}
		// 旋转需要的参数更加精细，取视场角调节的一半
		int step = PIXEL_STEP / 2;
		if (step < 1)
			step = 1;
		// 调整行对齐，从左往右对齐
		// 存储所有匹配成功的参数，目标图相对于原图的垂直方向位移
		ArrayList<Integer> deltYs = new ArrayList<Integer>();
		for (int i = 0; i < imgs.length; i++) {
			for (int j = 1; j < imgs[i].length; j++) {
				Point delt = ImageUtils.match(imgs[i][j - 1], imgs[i][j], ROTATE_MOVE_MAX, MATCH_WIDTH, step,
						ImageUtils.LR);
				if (delt != null) {
					deltYs.add(delt.y);
				}
			}
		}
		int maxCount = 10;// 求平均值的最大迭代次数
		int rotateh = ImageUtils.calAverage(deltYs, 0, ROTATE_MOVE_MAX / 3, maxCount, true);

		// 竖直方向
		ArrayList<Integer> deltXs = new ArrayList<Integer>();
		for (int j = 0; j < imgs[0].length; j++) {
			for (int i = 1; i < imgs.length; i++) {
				Point delt = ImageUtils.match(imgs[i - 1][j], imgs[i][j], ROTATE_MOVE_MAX, MATCH_WIDTH, step,
						ImageUtils.BT);
				if (delt != null)
					deltXs.add(delt.x);
			}
		}
		int rotatew = ImageUtils.calAverage(deltXs, 0, ROTATE_MOVE_MAX / 3, maxCount, true);
		// 旋转，并返回旋转角度
		double angle = rotate(imgs, new Point(rotatew, rotateh));

		// 达到迭代次数，返回本次转动角
		if (count == 1)
			return angle;
		return angle + calRotateParamAndRotate(imgs, count - 1);

	}

	/**
	 * 旋转图片
	 * 
	 * @author wangtao34
	 * @time 2017年7月31日 下午3:48:47
	 * @param imgs
	 * @param delt
	 */
	private static double rotate(BufferedImageCut[][] imgs, Point delt) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return 0;
		}
		int height = 1;
		int width = 1;
		boolean keep = true;// 跳出外循环标记
		for (int i = 0; i < imgs.length && keep; i++) {
			for (int j = 0; j < imgs[i].length; j++) {
				if (imgs[i][j].isValid()) {
					height = imgs[i][j].getHeight();
					width = imgs[i][j].getWidth();
					keep = false;
					break;
				}
			}
		}
		// 旋转角度为水平参量和垂直参量的平均值
		double angle = (Math.toDegrees(Math.atan((double) delt.y / width))
				+ Math.toDegrees(Math.atan((double) delt.x / height))) / 2;
		// 转角超过20度，极有可能存在问题，放弃旋转
		if (Math.abs(angle) > 20) {
			LogUtil.logError(GeneralViewUtil.class, "旋转角" + angle + "超过20度，放弃旋转，需要检查拍摄的图片源是否合理");
			return 0;
		}
		for (int i = 0; i < imgs.length; i++) {
			for (int j = 0; j < imgs[i].length; j++) {
				if (imgs[i][j].isValid()) {
					BufferedImage afterRotate = ImageUtils.rotate(imgs[i][j].getImg(), angle);
					imgs[i][j].setImg(afterRotate);

				}
			}
		}
		return angle;
	}

	/**
	 * 生成用于在ie8下面查看的图片
	 * 
	 * @author wangtao34
	 * @time 2017年7月17日 下午4:09:18
	 * @param srcImage
	 * @param destImage
	 * @param targetArea
	 *            目标图片面积
	 */
	private static void generateSmall(String srcImage, String destImage, int targetArea) {
		BufferedImage src = null;
		try {
			src = ImageIO.read(new File(srcImage));
		} catch (IOException e) {
			LogUtil.logError(GeneralViewUtil.class, "读取原图失败" + srcImage);
			return;
		}
		int width = src.getWidth();
		int height = src.getHeight();
		int area = width * height;
		if (area <= targetArea) {
			try {
				ImageIO.write(src, "JPEG", new File(destImage));
			} catch (IOException e) {
				LogUtil.logError(GeneralViewUtil.class, "保存ie8下面查看的图片失败" + destImage);
			}
			return;
		}
		double radio = Math.sqrt(DataUtil.div(area, targetArea, 6));
		int targetW = (int) (width / radio);
		int targetH = (int) (height / radio);
		BufferedImage result = ImageUtils.resize(src, targetW, targetH);
		try {
			ImageIO.write(result, "JPEG", new File(destImage));
		} catch (IOException e) {
			LogUtil.logError(GeneralViewUtil.class, "保存ie8下面查看的图片失败" + destImage);
		}
	}

	/**
	 * 生成缩略图，将图片缩小及裁剪，以适应预览需要
	 * 
	 * @author wangtao34
	 * @time 2017年7月17日 下午4:24:40
	 * @param srcImage
	 * @param destImage
	 * @param targetW
	 *            目标图片宽度
	 * @param targetH
	 *            目标图片高度
	 */
	private static void generateThumbnail(String srcImage, String destImage, int targetW, int targetH) {
		double radio = DataUtil.div(targetW, targetH, 6);
		BufferedImage src = null;
		try {
			src = ImageIO.read(new File(srcImage));
		} catch (IOException e) {
			LogUtil.logError(GeneralViewUtil.class, "读取原图失败" + srcImage);
			return;
		}
		int width = src.getWidth();
		int height = src.getHeight();
		if (width < targetW || height < targetH) {
			try {
				ImageIO.write(src, "JPEG", new File(destImage));
			} catch (IOException e) {
				LogUtil.logError(GeneralViewUtil.class, "保存缩略图失败" + destImage);
			}
			return;
		}
		int newWidth = targetW;
		int newHeight = targetH;
		int x = 0;
		int y = 0;
		double srcRadio = DataUtil.div(width, height, 6);
		if (radio < srcRadio) {
			newWidth = (int) (targetH * srcRadio);
			x = (newWidth - targetW) / 2;
		} else {
			newHeight = (int) (targetW / srcRadio);
			y = (newHeight - targetH) / 2;
		}
		BufferedImage resizeImage = ImageUtils.resize(src, newWidth, newHeight);
		BufferedImageCut cutImage = new BufferedImageCut(resizeImage, targetW, targetH, x, y);
		BufferedImage result = cutImage.getCuttedImg();
		try {
			ImageIO.write(result, "JPEG", new File(destImage));
		} catch (IOException e) {
			LogUtil.logError(GeneralViewUtil.class, "保存缩略图失败" + destImage);
		}
	}
	/**
	 * 生成压缩后的最终图片
	 * 
	 * @author wangtao34
	 * @time 2017年8月31日 下午4:31:34
	 * @param srcImage
	 * @param destImage
	 * @param height 图片高度
	 */
	private static void generateFinal(String srcImage, String destImage, int targetH) {
		BufferedImage src = null;
		try {
			src = ImageIO.read(new File(srcImage));
		} catch (IOException e) {
			LogUtil.logError(GeneralViewUtil.class, "读取原图失败" + srcImage);
			return;
		}
		int width = src.getWidth();
		int height = src.getHeight();
		if (height <= targetH) {
			return;
		}
		int targetW = (int) (targetH * width / height);
		BufferedImage result = ImageUtils.resize(src, targetW, targetH);
		try {
			ImageIO.write(result, "JPEG", new File(destImage));
		} catch (IOException e) {
			LogUtil.logError(GeneralViewUtil.class, "保存压缩后的图片失败" + destImage);
		}
	}
	/**
	 * 水平方向模糊图像边界
	 * 
	 * @author wangtao34
	 * @time 2017年7月20日 下午6:53:40
	 * @param imgs
	 * @return
	 */
	private static void blurHor(BufferedImageCut[][] imgs) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return;
		}
		for (int i = 0; i < imgs.length; i++) {
			for (int j = 0; j < imgs[i].length - 1; j++) {
				ImageUtils.blurLR(imgs[i][j], imgs[i][j + 1], BLUR_WIDTH);
			}
		}
	}

	/**
	 * 竖直方向模糊图像边界
	 * 
	 * @author wangtao34
	 * @time 2017年7月20日 下午6:54:12
	 * @param imgs
	 * @return
	 */
	private static void blurVer(BufferedImageCut[][] imgs) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return;
		}
		for (int j = 0; j < imgs[0].length; j++) {
			for (int i = 0; i < imgs.length - 1; i++) {
				ImageUtils.blurBT(imgs[i][j], imgs[i + 1][j], BLUR_WIDTH);
			}
		}
	}

	/**
	 * 调整亮度，从左下角开始
	 * 
	 * @author wangtao34
	 * @time 2017年7月13日 下午6:31:42
	 * @param imgs
	 * @return
	 */
	private static void adjustBrightBL(BufferedImageCut[][] imgs) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return;
		}
		// 调整第一行亮度一致
		if (imgs[0].length > 1) {
			double rBright = ImageUtils.getPartBrightInfo(imgs[0][0], 3, BRIGHT_WIDTH);
			for (int i = 1; i < imgs[0].length; i++) {
				if (imgs[0][i].isValid()) {
					if (imgs[0][i - 1].isValid()) {// 自己不是无效图，前人不是无效图
						double lBright = ImageUtils.getPartBrightInfoOutside(imgs[0][i], 2, BRIGHT_WIDTH);
						ImageUtils.adjustBrightness(imgs[0][i], (int) (rBright - lBright), BRIGHT_WIDTH);
					}
					rBright = ImageUtils.getPartBrightInfo(imgs[0][i], 3, BRIGHT_WIDTH);
				}
				// 自己是无效图，什么都不做
			}
		}
		// 调整第一列亮度一致
		double tBright = ImageUtils.getPartBrightInfo(imgs[0][0], 0, BRIGHT_WIDTH);
		for (int i = 1; i < imgs.length; i++) {
			if (imgs[i][0].isValid()) {
				if (imgs[i - 1][0].isValid()) {
					double bBright = ImageUtils.getPartBrightInfoOutside(imgs[i][0], 1, BRIGHT_WIDTH);
					ImageUtils.adjustBrightness(imgs[i][0], (int) (tBright - bBright), BRIGHT_WIDTH);
				}
				tBright = ImageUtils.getPartBrightInfo(imgs[i][0], 0, BRIGHT_WIDTH);
			}
		}
		// 调整之后列的亮度，取决于左侧和下侧亮度值
		if (imgs.length > 1) {
			for (int j = 1; j < imgs[0].length; j++) {
				tBright = ImageUtils.getPartBrightInfo(imgs[0][j], 0, BRIGHT_WIDTH);
				for (int i = 1; i < imgs.length; i++) {
					if (imgs[i][j].isValid()) {
						double bBright = ImageUtils.getPartBrightInfoOutside(imgs[i][j], 1, BRIGHT_WIDTH);
						double lBright = ImageUtils.getPartBrightInfoOutside(imgs[i][j], 2, BRIGHT_WIDTH);
						double rBright = lBright;
						if (imgs[i][j - 1].isValid()) {
							rBright = ImageUtils.getPartBrightInfo(imgs[i][j - 1], 3, BRIGHT_WIDTH);
						}
						if (!imgs[i - 1][j].isValid()) {
							tBright = bBright;
						}
						ImageUtils.adjustBrightnessGradientLB(imgs[i][j], rBright - lBright, tBright - bBright,
								BRIGHT_WIDTH);
						tBright = ImageUtils.getPartBrightInfo(imgs[i][j], 0, BRIGHT_WIDTH);
					}
				}
			}
		}
	}

	/**
	 * 从每张图的四周调整亮度
	 * 
	 * @author wangtao34
	 * @time 2017年7月14日 上午11:33:37
	 * @param allImages
	 * @return
	 */
	private static void adjustBrightTLBR(BufferedImageCut[][] imgs) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return;
		}
		// 四周内外亮度
		double inL, inR, inT, inB, outL, outR, outT, outB;
		for (int i = 0; i < imgs.length; i++) {
			for (int j = 0; j < imgs[i].length; j++) {
				if (!imgs[i][j].isValid())
					continue;
				inL = ImageUtils.getPartBrightInfoOutside(imgs[i][j], 2, BRIGHT_WIDTH);
				inR = ImageUtils.getPartBrightInfoOutside(imgs[i][j], 3, BRIGHT_WIDTH);
				inT = ImageUtils.getPartBrightInfoOutside(imgs[i][j], 0, BRIGHT_WIDTH);
				inB = ImageUtils.getPartBrightInfoOutside(imgs[i][j], 1, BRIGHT_WIDTH);

				if (j != 0 && imgs[i][j - 1].isValid()) {
					outL = ImageUtils.getPartBrightInfo(imgs[i][j - 1], 3, BRIGHT_WIDTH);
				} else {
					outL = inL;
				}

				if (j != imgs[i].length - 1 && imgs[i][j + 1].isValid()) {
					outR = ImageUtils.getPartBrightInfo(imgs[i][j + 1], 2, BRIGHT_WIDTH);
				} else {
					outR = inR;
				}

				if (i != imgs.length - 1 && imgs[i + 1][j].isValid()) {
					outT = ImageUtils.getPartBrightInfo(imgs[i + 1][j], 1, BRIGHT_WIDTH);
				} else {
					outT = inT;
				}

				if (i != 0 && imgs[i - 1][j].isValid()) {
					outB = ImageUtils.getPartBrightInfo(imgs[i - 1][j], 0, BRIGHT_WIDTH);
				} else {
					outB = inB;
				}

				ImageUtils.adjustBrightnessTLBR(imgs[i][j], outT - inT, outB - inB, outL - inL, outR - inR,
						BRIGHT_WIDTH);

			}
		}
	}

	/**
	 * 直接拼接所有裁剪好的图片
	 * 
	 * @author wangtao34
	 * @time 2017年7月13日 上午11:31:16
	 * @param allImages
	 * @return
	 */
	private static BufferedImage stitchAllImages(BufferedImageCut[][] imgs) {
		if (imgs == null || imgs.length == 0 || imgs[0].length == 0) {
			return null;
		}
		// 如果遇到无效图，就用deadImg代替填充，改图的宽高代表默认宽高
		// 如果整行或整列没有有效图，就填充这一高度或宽度的空白色块代替
		BufferedImageCut deadImg = new BufferedImageCut(new BufferedImage(400, 300, BufferedImage.TYPE_3BYTE_BGR));
		// 无效图填充颜色(r,g,b)
		int deadColor = ImageUtils.getPix(new int[] { 0, 200, 0 });
		int totalHeight = 0;
		int totalWidth = 0;

		int[] widths = new int[imgs[0].length];
		int[] heights = new int[imgs.length];
		int imgType = BufferedImage.TYPE_3BYTE_BGR;
		// 计算总高度，总宽度
		for (int i = 0; i < imgs.length; i++) {
			heights[i] = deadImg.getHeight();// 可以改
			for (int j = 0; j < imgs[i].length; j++) {
				if (imgs[i][j].isValid()) {
					heights[i] = imgs[i][j].getHeight();
					imgType = imgs[i][j].getType();
					break;
				}
			}
			totalHeight += heights[i];
		}
		for (int j = 0; j < imgs[0].length; j++) {
			widths[j] = deadImg.getWidth();
			for (int i = 0; i < imgs.length; i++) {
				if (imgs[i][j].isValid()) {
					widths[j] = imgs[i][j].getWidth();
					break;
				}
			}
			totalWidth += widths[j];
		}
		// 拼接结果图
		BufferedImage result = new BufferedImage(totalWidth, totalHeight, imgType);
		int nowx = 0;// 结果图中x方向当前基准
		int nowy = 0;// y当前基准
		for (int i = imgs.length - 1; i >= 0; i--) {
			for (int j = 0; j < imgs[i].length; j++) {
				if (imgs[i][j].isValid()) {
					for (int x = 0; x < imgs[i][j].getWidth(); x++) {
						for (int y = 0; y < imgs[i][j].getHeight(); y++) {
							result.setRGB(x + nowx, y + nowy, imgs[i][j].getRGB(x, y));
						}
					}
				} else {// 无效图用纯色填满
					for (int x = 0; x < widths[j]; x++) {
						for (int y = 0; y < heights[i]; y++) {
							result.setRGB(x + nowx, y + nowy, deadColor);
						}
					}
				}
				nowx += widths[j];
			}
			nowx = 0;
			nowy += heights[i];
		}
		return result;
	}

	/**
	 * 有效比例有效性判断 如果有有效区域占比>=1或者<=0，返回false
	 * 
	 * @author wangtao34
	 * @time 2017年7月13日 下午1:53:20
	 * @param effRatioH
	 * @return
	 */
	private static boolean isValid(double effRatio) {
		if (effRatio < 1 && effRatio > 0) {
			return true;
		}
		return false;
	}

	// wangtao34 新添加以上内容
	/**
	 * 从ftp上下载图片到本地
	 * 
	 * @author wanghongkai
	 * @datatime 2016年10月27日 上午10:13:26
	 * @param picArray
	 * @param localPath
	 * @return
	 */
	public static boolean downloadFile(String username, String password, String[] picArray, String localPath) {
		if (CommonLicenseUtil.isNewVersion()) {
			for (int i = 0; i < picArray.length; i++) {
				byte[] btImg = HttpImageUtil.getImageFromNetByUrl(picArray[i]);
				if (null != btImg && btImg.length > 0) {
					HttpImageUtil.writeImageToDisk(btImg, localPath + "/" + (i + 1) + ".jpg");
				} else {
					return false;
				}
			}
			return true;
		} else {
			if (picArray == null || picArray.length == 0) {
				return false;
			}
			String url = picArray[0];
			int separate1 = url.indexOf("//");
			int separate2 = url.indexOf(":", 6);
			int separate3 = url.indexOf("/", separate2);
			int separate4 = url.lastIndexOf("/");
			String host = url.substring(separate1 + 2, separate2);
			int port = Integer.parseInt(url.substring(separate2 + 1, separate3));
			String remotePath = url.substring(separate3, separate4);
			String[] fileNames = new String[picArray.length];
			for (int i = 0; i < picArray.length; i++) {
				fileNames[i] = getFileNameFromUrl(picArray[i]);
			}
			FTPClient ftp = new FTPClient();
			try {
				int reply;
				ftp.connect(host, port);
				ftp.login(username, password);// 登录
				reply = ftp.getReplyCode();
				if (!FTPReply.isPositiveCompletion(reply)) {
					ftp.disconnect();
					throw new Exception("连接FTP服务器失败！");
				}
				ftp.setFileType(FTPClient.BINARY_FILE_TYPE);
				ftp.changeWorkingDirectory(remotePath);// 转移到FTP服务器目录
				FTPFile[] fs = ftp.listFiles();
				boolean isFind = false;
				int i = 0;
				for (String fileName : fileNames) {
					i++;
					for (FTPFile ftpFile : fs) {
						String ftpFileName = ftpFile.getName();
						if (StringUtils.isNotEmpty(fileName) && fileName.equals(ftpFileName)) {
							File localFile = new File(localPath + "/" + i + ".jpg");
							OutputStream os = new FileOutputStream(localFile);
							ftp.retrieveFile(ftpFile.getName(), os);
							os.close();
							isFind = true;
						}
					}
					if (!isFind) {
						return false;
					}
					isFind = false;
				}
				ftp.logout();
				return true;
			} catch (Exception e) {
				e.printStackTrace();
			}
			return false;
		}
	}

	/**
	 * 从抓图的返回的url中获取图片的名称
	 * 
	 * @author wanghongkai
	 * @datatime 2016年10月27日 上午10:13:44
	 * @param url
	 * @return
	 */
	public static String getFileNameFromUrl(String url) {
		if (url == null) {
			return null;
		}
		int separate = url.lastIndexOf("/");
		return url.substring(separate + 1);
	}

	/**
	 * 从配置文件中获取抓图所需参数
	 * 
	 * @author wanghongkai
	 * @datatime 2016年12月27日 下午8:02:01
	 * @param towerIndexCode
	 * @return
	 */
	public static PanoramaCaptureParam getCaptureParamByTower(String cameraIndexCode) {
		try {
			String path = new File(URLDecoder.decode(GeneralViewUtil.class.getResource("/").getPath(), "utf-8"))
					.getPath() + "/panorama.xml";
			// wangtao34
			// LogUtil.logError(GeneralViewUtil.class, "获取配置文件路径："+path);
			Document document = new SAXReader().read(path);
			Element element = document.getRootElement();
			@SuppressWarnings("unchecked")
			List<Element> towerList = element.elements();
			for (Element e : towerList) {
				if (cameraIndexCode.equals(e.attributeValue("indexcode"))) {
					float startVerAngle = Float.parseFloat(e.element("startVerAngle").getStringValue());
					float endVerAngle = Float.parseFloat(e.element("endVerAngle").getStringValue());
					float startHorAngle = Float.parseFloat(e.element("startHorAngle").getStringValue());
					float endHorAngle = Float.parseFloat(e.element("endHorAngle").getStringValue());
					float zoom = Float.parseFloat(e.element("zoom").getStringValue());
					PanoramaCaptureParam param = new PanoramaCaptureParam(startVerAngle, endVerAngle, startHorAngle,
							endHorAngle, zoom);
					return param;
				}
			}
		} catch (Exception e) {
			LogUtil.logError(GeneralViewUtil.class, "获取全景图片抓图参数配置文件panorama.xml时出错");
		}
		return null;
	}
}
package cn.wangtao34.test;

import java.io.File;
import java.io.IOException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Set;

import org.apache.commons.io.FileUtils;

/**
 * 
 * @author wangtao34
 * @time 2017年8月28日 上午9:12:45
 */
public class Test {
	private static String dateTime = "2017-8-30 16:00:00 000";
	private static Long startTime;
	private static String newPath = "result";

	public static void main(String[] args) throws IOException {
		// 清空结果目录
		FileUtils.cleanDirectory(new File(newPath));
		// 转化开始时间
		startTime = convert2Millis(dateTime);
		// 遍历文件夹查找并复制
		traverseFolder("../GISV1.5/src/main");
	}

	public static void store(File file) {
		if (file.lastModified() > startTime) {
			String path = newPath + file.getPath().substring(2);
			if(path.endsWith(".jpg")){
				return;
			}
			System.out.println(path);
			File newFile = new File(path);
			try {
				FileUtils.copyFile(file, newFile);
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
	}

	public static Long convert2Millis(String dateTime) {
		Calendar calendar = Calendar.getInstance();
		try {
			calendar.setTime(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss SSS").parse(dateTime));
		} catch (ParseException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		System.out.println("日期[" + dateTime + "]对应毫秒：" + calendar.getTimeInMillis());
		return calendar.getTimeInMillis();
	}

	public static void traverseFolder(String path) {
		int fileNum = 0, folderNum = 0;
		File file = new File(path);
		if (file.exists()) {
			LinkedList<File> list = new LinkedList<File>();
			File[] files = file.listFiles();
			for (File file2 : files) {
				if (file2.isDirectory()) {
					// System.out.println("文件夹:" + file2.getAbsolutePath());
					list.add(file2);
					folderNum++;
				} else {
					// System.out.println("文件:" + file2.getAbsolutePath() +
					// file2.lastModified());
					store(file2);
					fileNum++;
				}
			}
			File temp_file;
			while (!list.isEmpty()) {
				temp_file = list.removeFirst();
				files = temp_file.listFiles();
				for (File file2 : files) {
					if (file2.isDirectory()) {
						// System.out.println("文件夹:" + file2.getAbsolutePath());
						list.add(file2);
						folderNum++;
					} else {
						// System.out.println("文件:" + file2.getAbsolutePath() +
						// file2.lastModified());
						store(file2);
						fileNum++;
					}
				}
			}
		} else {
			System.out.println("文件不存在!");
		}
		System.out.println("文件夹共有:" + folderNum + ",文件共有:" + fileNum);

	}
}

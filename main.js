/** @format */

const path = require('path');
const os = require('os');

const {
	app,
	BrowserWindow,
	Menu,
	globalShortcut,
	ipcMain,
	shell,
} = require('electron');
const imageminPngquant = require('imagemin-pngquant');
const log = require('electron-log');

// Set env
process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production';
const isMac = process.platform === 'darwin';

let mainWindow;
let aboutWindow;

function createMainWindow() {
	mainWindow = new BrowserWindow({
		title: 'ImageShrink',
		width: isDev ? 900 : 500,
		height: 600,
		icon: './assets/icons/Icon_256x256.png',
		resizable: isDev,
		webPreferences: {
			//nodeIntegration:true and contextIsolation:false are both needed to use require on render side
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	mainWindow.loadFile('./app/index.html');
}

function createAboutWindow() {
	aboutWindow = new BrowserWindow({
		title: 'About ImageShrink',
		width: 300,
		// width: isDev ? 900 : 500,
		height: 300,
		icon: './assets/icons/Icon_256x256.png',
		resizable: false,
	});

	aboutWindow.loadFile('./app/about.html');
}

app.on('ready', () => {
	createMainWindow();
	if (isDev) mainWindow.webContents.openDevTools();

	const mainMenu = Menu.buildFromTemplate(menu);
	Menu.setApplicationMenu(mainMenu);

	mainWindow.on('ready', () => (mainWindow = null));
});

const menu = [
	...(isMac
		? [
				{
					label: 'app.name',
					submenu: [
						{
							label: 'About',
							click: createAboutWindow,
						},
						{ type: 'separator' },
						{
							label: 'Quit ImageShrink',
							accelerator: 'CmdOrCtrl+Q',
							click: () => app.quit(),
						},
					],
				},
		  ]
		: []),
	{
		role: 'fileMenu',
	},
	...(!isMac
		? [
				{
					label: 'Help',
					subMenu: [
						{
							label: 'About',
							click: createAboutWindow,
						},
					],
				},
		  ]
		: []),
	...(isDev
		? [
				{
					label: 'Developer',
					submenu: [
						{ role: 'reload' },
						{ role: 'forcereload' },
						{ type: 'separator' },
						{ role: 'toggledevtools' },
					],
				},
		  ]
		: []),
];

ipcMain.on('image:minimize', (e, options) => {
	options.dest = path.join(os.homedir(), 'imageshrink');
	shrinkImage(options);
});

async function shrinkImage({ imgPath, quality, dest }) {
	try {
		const imagemin = (await import('imagemin')).default;
		const imageminMozjpeg = (await import('imagemin-mozjpeg')).default;
		const slash = (await import('slash')).default;

		const pngQuality = quality / 100;
		const files = await imagemin([slash(imgPath)], {
			destination: dest,
			plugins: [
				imageminMozjpeg({ quality }),
				imageminPngquant({
					quality: [pngQuality, pngQuality],
				}),
			],
		});
		log.info(files);

		shell.openPath(dest);

		mainWindow.webContents.send('image:done');
	} catch (error) {
		log.error(err);
	}
}

app.on('window-all-closed', () => {
	if (!isMac) app.quit();
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createMainWindow();
		if (isDev) mainWindow.webContents.openDevTools();
	}
});

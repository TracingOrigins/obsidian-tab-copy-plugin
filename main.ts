import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

// 插件设置接口，定义了插件的设置选项
interface TabCopyPluginSettings {
	enableDoubleClick: boolean; // 是否启用双击事件
}

// 插件的默认设置
const DEFAULT_SETTINGS: TabCopyPluginSettings = {
	enableDoubleClick: true,
};

// 插件主类，继承自 Obsidian 的 Plugin 类
export default class TabCopyPlugin extends Plugin {
	settings: TabCopyPluginSettings; // 插件的设置
	private observer: MutationObserver; // 观察者，用于监听 DOM 变化
	public enableDoubleClick: boolean; // 是否启用双击事件，设置为 public

	// 插件加载时调用
	async onload() {
		console.log('Loading TabCopyPlugin...');

		// 加载设置
		await this.loadSettings();

		// 注册命令
		this.addCommand({
			id: 'copy-link',
			name: 'Copy Link',
			callback: () => this.copyLink(),
		});

		// 如果启用了双击事件，则添加双击事件监听器
		if (this.settings.enableDoubleClick) {
			this.addDoubleClickListener();
		}

		// 创建观察者，监听 DOM 变化
		this.observer = new MutationObserver(() => {
			if (this.settings.enableDoubleClick) {
				this.addDoubleClickListener();
			} else {
				this.removeDoubleClickListener();
			}
		});

		// 开始观察
		this.observer.observe(document.body, { childList: true, subtree: true });

		// 添加设置选项卡
		this.addSettingTab(new TabCopySettingTab(this.app, this));
	}

	// 插件卸载时调用
	onunload() {
		console.log('Unloading TabCopyPlugin...');

		// 移除双击事件监听器
		this.removeDoubleClickListener();

		// 断开观察者
		if (this.observer) {
			this.observer.disconnect();
		}
	}

	// 添加双击事件监听器
	addDoubleClickListener() {
		this.removeDoubleClickListener(); // 确保没有重复的监听器

		const activeTab = document.querySelector('.workspace-tab-header.tappable.is-active.mod-active') as HTMLElement;
		if (activeTab) {
			activeTab.addEventListener('dblclick', this.handleDoubleClick);
		}
	}

	// 移除双击事件监听器
	removeDoubleClickListener() {
		const activeTab = document.querySelector('.workspace-tab-header.tappable.is-active.mod-active') as HTMLElement;
		if (activeTab) {
			activeTab.removeEventListener('dblclick', this.handleDoubleClick);
		}
	}

	// 双击事件的处理函数
	handleDoubleClick = () => {
		this.copyLink();
	}

	// 复制链接的功能
	copyLink() {
		// 查找当前激活的标签页及其关联内容
		const activeTab = document.querySelector('.workspace-tab-header.tappable.is-active.mod-active') as HTMLElement;
		if (activeTab) {
			const tabTitle = activeTab.innerText;
			const dataType = activeTab.getAttribute('data-type');

			if (dataType === 'webviewer') {
				// 查找关联的 webview 元素
				const webviewContent = document.querySelector('.view-content.webviewer-content webview') as HTMLElement;
				const tabLink = webviewContent ? webviewContent.getAttribute('src') : '';

				const markdownLink = `[${tabTitle}](${tabLink})`;
				console.log('Markdown link:', markdownLink);

				// 复制 markdown 链接到剪贴板
				navigator.clipboard.writeText(markdownLink).then(
					() => {
						console.log('Copied to clipboard:', markdownLink);
					},
					(err) => {
						console.error('Failed to copy to clipboard:', err);
					}
				);
			} else if (dataType === 'markdown') {
				const wikiLink = `[[${tabTitle}]]`;
				console.log('Wiki link:', wikiLink);

				// 复制 wiki 链接到剪贴板
				navigator.clipboard.writeText(wikiLink).then(
					() => {
						console.log('Copied to clipboard:', wikiLink);
					},
					(err) => {
						console.error('Failed to copy to clipboard:', err);
					}
				);
			}
		} else {
			console.log('No active tab found.');
		}
	}

	// 加载设置
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// 保存设置
	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// 插件设置选项卡类，继承自 PluginSettingTab
class TabCopySettingTab extends PluginSettingTab {
	plugin: TabCopyPlugin;

	constructor(app: App, plugin: TabCopyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// 显示设置选项卡
	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Tab Copy Settings' });

		// 添加启用双击事件的设置项
		new Setting(containerEl)
			.setName('Enable Double Click')
			.setDesc('Enable or disable the double click event for copying the link.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDoubleClick)
				.onChange(async (value) => {
					this.plugin.settings.enableDoubleClick = value;
					await this.plugin.saveSettings();

					if (value) {
						this.plugin.addDoubleClickListener();
					} else {
						this.plugin.removeDoubleClickListener();
					}
				}));
	}
}

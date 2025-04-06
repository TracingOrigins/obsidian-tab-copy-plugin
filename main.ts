/**
 * Tab Copy Plugin for Obsidian
 * 
 * 功能说明：
 * 这个插件使用户能够快速复制Obsidian中当前标签页的链接，提高工作效率。根据标签页类型自动选择合适的格式：
 * - Web Viewer标签页：复制为Markdown格式链接 [标签名](URL)
 * - Markdown笔记标签页：复制为Wiki格式链接 [[文件名]]
 * 
 * 主要特点：
 * 1. 通过命令面板提供"Copy Link"命令，一键复制当前标签页链接
 * 2. 支持通过双击标签页直接复制链接（可在设置中自定义开关）
 * 3. 智能识别标签页类型，自动生成对应格式的链接
 * 4. 操作完成后显示友好的成功/失败提示
 * 5. 适应Obsidian界面变化，确保功能稳定可靠
 * 
 * 技术实现：
 * 1. 使用DOM选择器精确定位当前激活标签页及其内容
 * 2. 通过MutationObserver监听界面变化，动态调整事件监听器
 * 3. 根据标签页的data-type属性决定生成链接的格式
 * 4. 使用Obsidian API的Notice组件提供视觉反馈
 * 5. 支持用户自定义设置，提高灵活性
 */

import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';

// 插件设置接口，定义可配置选项
interface TabCopyPluginSettings {
	enableDoubleClick: boolean; // 是否启用双击标签页复制链接功能
}

// 默认设置配置
const DEFAULT_SETTINGS: TabCopyPluginSettings = {
	enableDoubleClick: true, // 默认启用双击功能
};

// 插件主类，实现核心功能
export default class TabCopyPlugin extends Plugin {
	settings: TabCopyPluginSettings; // 用户设置存储
	private observer: MutationObserver; // DOM变化观察器
	public enableDoubleClick: boolean; // 双击功能状态标志

	// 插件初始化
	async onload() {
		// 加载用户设置或使用默认配置
		await this.loadSettings();

		// 注册命令面板指令
		this.addCommand({
			id: 'copy-link',
			name: 'Copy Link',
			callback: () => this.copyLink(),
		});

		// 根据设置决定是否启用双击功能
		if (this.settings.enableDoubleClick) {
			this.addDoubleClickListener();
		}

		// 创建DOM观察器，确保标签页切换后仍能正常工作
		this.observer = new MutationObserver(() => {
			if (this.settings.enableDoubleClick) {
				this.addDoubleClickListener();
			} else {
				this.removeDoubleClickListener();
			}
		});

		// 开始监听DOM变化
		this.observer.observe(document.body, { childList: true, subtree: true });

		// 添加设置界面
		this.addSettingTab(new TabCopySettingTab(this.app, this));
	}

	// 插件卸载清理
	onunload() {
		// 移除事件监听器
		this.removeDoubleClickListener();

		// 停止DOM观察
		if (this.observer) {
			this.observer.disconnect();
		}
	}

	// 添加双击事件监听器
	addDoubleClickListener() {
		this.removeDoubleClickListener(); // 先清除现有监听器，避免重复

		// 定位当前激活的标签页
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

	// 双击事件处理函数
	handleDoubleClick = () => {
		this.copyLink();
	}

	// 核心功能：复制链接到剪贴板
	copyLink() {
		// 定位当前激活的标签页
		const activeTab = document.querySelector('.workspace-tab-header.tappable.is-active.mod-active') as HTMLElement;
		if (activeTab) {
			// 精确获取标签页标题（从标题内部元素获取更可靠）
			const tabTitle = (document.querySelector('.workspace-tab-header.tappable.is-active.mod-active .workspace-tab-header-inner-title') as HTMLElement).innerText;
			const dataType = activeTab.getAttribute('data-type'); // 获取标签页类型

			if (dataType === 'webviewer') {
				// 处理网页查看器标签页
				const webviewContent = document.querySelector('.view-content.webviewer-content webview') as HTMLElement;
				const tabLink = webviewContent ? webviewContent.getAttribute('src') : '';

				// 生成Markdown格式链接
				const markdownLink = `[${tabTitle}](${tabLink})`;

				// 复制到剪贴板并显示结果
				navigator.clipboard.writeText(markdownLink).then(
					() => {
						new Notice('已复制 Markdown 链接: ' + markdownLink);
					},
					() => {
						new Notice('复制失败，请重试');
					}
				);
			} else if (dataType === 'markdown') {
				// 处理Markdown笔记标签页
				const wikiLink = `[[${tabTitle}]]`;

				// 复制到剪贴板并显示结果
				navigator.clipboard.writeText(wikiLink).then(
					() => {
						new Notice('已复制 Wiki 链接: ' + wikiLink);
					},
					() => {
						new Notice('复制失败，请重试');
					}
				);
			}
		} else {
			// 未找到激活的标签页
			new Notice('未找到激活的标签页');
		}
	}

	// 加载插件设置
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// 保存插件设置
	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// 设置选项卡实现
class TabCopySettingTab extends PluginSettingTab {
	plugin: TabCopyPlugin; // 插件实例引用

	constructor(app: App, plugin: TabCopyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// 渲染设置界面
	display(): void {
		const { containerEl } = this;

		containerEl.empty(); // 清空原有内容

		containerEl.createEl('h2', { text: 'Tab Copy 设置' });

		// 添加双击功能设置项
		new Setting(containerEl)
			.setName('启用双击复制')
			.setDesc('开启或关闭双击标签页时自动复制链接的功能')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDoubleClick)
				.onChange(async (value) => {
					this.plugin.settings.enableDoubleClick = value;
					await this.plugin.saveSettings();

					// 立即应用设置变更
					if (value) {
						this.plugin.addDoubleClickListener();
					} else {
						this.plugin.removeDoubleClickListener();
					}
				}));
	}
}

<script lang="ts">
	import { Paperclip } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { FILE_TYPE_ICONS } from '$lib/constants/icons';
	import { FileTypeCategory } from '$lib/enums';

	interface Props {
		class?: string;
		disabled?: boolean;
		hasAudioModality?: boolean;
		hasVisionModality?: boolean;
		onFileUpload?: (fileType?: FileTypeCategory) => void;
	}

	let {
		class: className = '',
		disabled = false,
		hasAudioModality = false,
		hasVisionModality = false,
		onFileUpload
	}: Props = $props();

	const fileUploadTooltipText = $derived.by(() => {
		return !hasVisionModality
			? 'Text files and PDFs supported. Images, audio, and video require vision models.'
			: 'Attach files';
	});

	function handleFileUpload(fileType?: FileTypeCategory) {
		onFileUpload?.(fileType);
	}
</script>

<div class="flex items-center gap-1 {className}">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger name="Attach files" {disabled}>
			<Tooltip.Root>
				<Tooltip.Trigger>
					<Button
						class="file-upload-button h-8 w-8 rounded-full bg-transparent p-0 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
						{disabled}
						type="button"
					>
						<span class="sr-only">Attach files</span>

						<Paperclip class="h-4 w-4" />
					</Button>
				</Tooltip.Trigger>

				<Tooltip.Content>
					<p>{fileUploadTooltipText}</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</DropdownMenu.Trigger>

		<DropdownMenu.Content align="start" class="w-48">
			<DropdownMenu.Item
				class="images-button flex cursor-pointer items-center gap-2"
				onclick={() => handleFileUpload(FileTypeCategory.IMAGE)}
			>
				<FILE_TYPE_ICONS.image class="h-4 w-4" />

				<span>Images</span>
			</DropdownMenu.Item>

			<!-- Audio and Text options removed as per user request -->

			<DropdownMenu.Item
				class="flex cursor-pointer items-center gap-2"
				onclick={() => handleFileUpload(FileTypeCategory.PDF)}
			>
				<FILE_TYPE_ICONS.pdf class="h-4 w-4" />

				<span>PDF Files</span>
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>

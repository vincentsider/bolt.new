import { WorkflowPostProcessor } from './workflow-post-processor';

export class ComponentTransformStream extends TransformStream {
  private buffer = '';
  private organizationId: string;
  private workflowDescription: string;
  private postProcessor: WorkflowPostProcessor;
  private isProcessing = false;

  constructor(organizationId: string, workflowDescription: string) {
    super({
      async transform(chunk, controller) {
        let decoder: TextDecoder;
        if (!decoder) {
            decoder = new TextDecoder();
        }
        const text = decoder.decode(chunk);
        
        // Always pass through the original chunk to maintain streaming
        controller.enqueue(chunk);
        
        // Buffer the text for processing
        this.buffer += text;
        
        // Process when we have a complete artifact
        if (!this.isProcessing && this.buffer.includes('</boltArtifact>')) {
          this.isProcessing = true;
          
          try {
            // Extract files from the buffered content
            const files = this.extractFilesFromArtifact(this.buffer);
            
            if (files.length > 0 && this.organizationId) {
              console.log(`🔄 COMPONENT TRANSFORM: Processing ${files.length} files for component injection`);
              
              // Process files with component library
              const processed = await this.postProcessor.processWorkflowFiles(
                files,
                this.workflowDescription
              );
              
              if (processed.componentUsage.total > 0) {
                // Send a comment about component usage
                const comment = `\n<!-- Component Library: Used ${processed.componentUsage.fromLibrary} components from library, ${processed.componentUsage.fallback} fallback components -->\n`;
                let encoder: TextEncoder;
                if (!encoder) {
                    encoder = new TextEncoder();
                }
                controller.enqueue(encoder.encode(comment));
                
                console.log(`✅ COMPONENT TRANSFORM: Injected ${processed.componentUsage.total} components`);
              }
            }
          } catch (error) {
            console.error('❌ COMPONENT TRANSFORM: Error processing files:', error);
          }
          
          this.isProcessing = false;
        }
      },

      flush(controller) {
        // Any final processing
        if (this.buffer && !this.isProcessing) {
          try {
            const files = this.extractFilesFromArtifact(this.buffer);
            console.log(`🏁 COMPONENT TRANSFORM: Final processing of ${files.length} files`);
          } catch (error) {
            console.error('❌ COMPONENT TRANSFORM: Error in flush:', error);
          }
        }
      }
    });

    this.organizationId = organizationId;
    this.workflowDescription = workflowDescription;
    this.postProcessor = new WorkflowPostProcessor(organizationId);
  }

  private extractFilesFromArtifact(content: string): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];
    
    // Match all boltAction file entries
    const fileMatches = content.matchAll(/<boltAction\s+type="file"\s+filePath="([^"]+)"[^>]*>([\s\S]*?)<\/boltAction>/g);
    
    for (const match of fileMatches) {
      const filePath = match[1];
      const fileContent = match[2].trim();
      
      files.push({
        path: filePath,
        content: fileContent
      });
    }
    
    return files;
  }
}
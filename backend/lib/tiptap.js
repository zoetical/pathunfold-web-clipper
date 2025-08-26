// TipTap JSON generator for Circle posts
// Implements the three-tier embedding strategy from the technical design

function createTipTapDocument(content) {
  return {
    type: "doc",
    content: Array.isArray(content) ? content : [content]
  };
}

function createParagraphNode(text, marks = []) {
  if (!text || text.trim() === '') {
    console.warn('createParagraphNode: Empty text provided');
    return {
      type: "paragraph",
      content: []
    };
  }

  const trimmedText = text.trim();
  console.log(`Creating paragraph node: ${trimmedText.length} chars, preview: "${trimmedText.substring(0, 50)}${trimmedText.length > 50 ? '...' : ''}"`);

  return {
    type: "paragraph",
    content: [{
      type: "text",
      text: trimmedText,
      ...(marks.length > 0 ? { marks } : {})
    }]
  };
}

function createLinkMark(url) {
  return {
    type: "link",
    attrs: {
      href: url,
      target: "_blank"
    }
  };
}

function createImageNode(signedId, alignment = "center") {
  return {
    type: "image",
    attrs: {
      signed_id: signedId,
      alignment,
      alt: "",
      title: ""
    }
  };
}

function createEmbedNode(sgid) {
  return {
    type: "embed",
    attrs: {
      sgid
    }
  };
}

function createFileNode(signedId, filename) {
  return {
    type: "file", 
    attrs: {
      signed_id: signedId,
      filename
    }
  };
}

function createAttachmentNode(signedId, filename) {
  return {
    type: "attachment",
    attrs: {
      signed_id: signedId,
      filename
    }
  };
}

// Main content generation using three-tier strategy
function generatePostContent(data) {
  console.log('Generating TipTap content with data:', {
    hasTitle: !!data.title,
    titleLength: data.title?.length || 0,
    hasSelectedText: !!data.selectedText,
    selectedTextLength: data.selectedText?.length || 0,
    selectedTextPreview: data.selectedText?.substring(0, 100) + (data.selectedText?.length > 100 ? '...' : ''),
    hasUrl: !!data.url,
    hasPreview: !!data.preview
  });
  
  const nodes = [];
  
  // Add title as heading if different from extracted content
  if (data.title && data.title.trim() && data.title !== data.selectedText) {
    nodes.push({
      type: "heading",
      attrs: { level: 2 },
      content: [{
        type: "text",
        text: data.title.trim()
      }]
    });
    console.log('Added title heading:', data.title.trim());
  }

  // Add selected text if available - this is the main content
  if (data.selectedText && data.selectedText.trim()) {
    console.log('Processing selectedText:', {
      originalLength: data.selectedText.length,
      trimmedLength: data.selectedText.trim().length,
      preview: `"${data.selectedText.substring(0, 200)}..."`
    });
    
    // Split into paragraphs for better formatting
    const paragraphs = data.selectedText.split('\n\n').filter(p => p.trim());
    
    if (paragraphs.length > 1) {
      // Multiple paragraphs - create separate paragraph nodes
      paragraphs.forEach((paragraph, index) => {
        if (paragraph.trim()) {
          nodes.push(createParagraphNode(paragraph.trim()));
          console.log(`Added paragraph ${index + 1}:`, paragraph.trim().substring(0, 100) + '...');
        }
      });
      console.log(`Added ${paragraphs.length} paragraph nodes from selectedText`);
    } else {
      // Single paragraph or short text
      nodes.push(createParagraphNode(data.selectedText.trim()));
      console.log('Added single paragraph from selectedText:', data.selectedText.trim().substring(0, 100) + '...');
    }
  } else if (data.preview && data.preview.description && data.preview.description.trim()) {
    // No selected text - use rich Iframely description as primary content
    console.log('No selectedText found, using Iframely description as primary content:', {
      descriptionLength: data.preview.description.length,
      preview: `"${data.preview.description.substring(0, 200)}..."`
    });
    
    // Split description into paragraphs for better formatting
    const descriptionParagraphs = data.preview.description.split('\\n\\n').filter(p => p.trim());
    
    if (descriptionParagraphs.length > 1) {
      // Multiple paragraphs in description
      descriptionParagraphs.forEach((paragraph, index) => {
        if (paragraph.trim()) {
          nodes.push(createParagraphNode(paragraph.trim()));
          console.log(`Added description paragraph ${index + 1}:`, paragraph.trim().substring(0, 100) + '...');
        }
      });
      console.log(`Added ${descriptionParagraphs.length} paragraph nodes from Iframely description`);
    } else {
      // Single paragraph description
      nodes.push(createParagraphNode(data.preview.description.trim()));
      console.log('Added single paragraph from Iframely description:', data.preview.description.trim().substring(0, 100) + '...');
    }
  } else {
    console.warn('No valid selectedText or preview description found:', {
      hasSelectedText: !!data.selectedText,
      selectedTextType: typeof data.selectedText,
      selectedTextValue: data.selectedText,
      hasPreviewDescription: !!(data.preview && data.preview.description),
      previewDescriptionLength: data.preview && data.preview.description ? data.preview.description.length : 0
    });
  }

  // Process URLs using three-tier strategy
  if (data.url) {
    const urlNode = processUrl(data.url, data.preview, data.mediaSignedId);
    if (urlNode) {
      if (Array.isArray(urlNode)) {
        nodes.push(...urlNode);
      } else {
        nodes.push(urlNode);
      }
    }
  }

  // Add media content
  if (data.imageSignedId) {
    nodes.push(createImageNode(data.imageSignedId, "center"));
  }

  if (data.mediaSignedId && data.mediaType) {
    if (data.mediaType === 'video' || data.mediaType === 'audio') {
      // For large media files, use attachment node
      nodes.push(createAttachmentNode(data.mediaSignedId, data.mediaFilename || 'media'));
    } else {
      nodes.push(createFileNode(data.mediaSignedId, data.mediaFilename || 'file'));
    }
  }

  // Add source link at the end if not already embedded
  if (data.url && !hasUrlEmbedded(nodes, data.url)) {
    nodes.push(createParagraphNode(`Source: ${data.url}`, [createLinkMark(data.url)]));
  }

  // Enhanced failsafe: Ensure we have meaningful content
  if (nodes.length === 0) {
    console.warn('No content nodes generated, creating failsafe content');
    
    // Try to create content from available data
    if (data.preview && data.preview.description) {
      nodes.push(createParagraphNode(data.preview.description));
      console.log('Added preview description as fallback content');
    } else if (data.preview && data.preview.title && data.preview.title !== data.title) {
      nodes.push(createParagraphNode(data.preview.title));
      console.log('Added preview title as fallback content');
    } else if (data.title) {
      nodes.push(createParagraphNode(`Web content: ${data.title}`));
      console.log('Added title-based fallback content');
    } else if (data.url) {
      nodes.push(createParagraphNode(`Content from: ${extractDomainFromUrl(data.url)}`));
      console.log('Added URL-based fallback content');
    } else {
      nodes.push(createParagraphNode("Content clipped from web"));
      console.log('Added generic fallback content');
    }
  }

  console.log(`Final TipTap document: ${nodes.length} nodes created`);
  return createTipTapDocument(nodes);
}

// Three-tier URL processing strategy
function processUrl(url, preview, mediaSignedId) {
  // Tier 1: Try to create embed node (if sgid is available in the future)
  // This would be implemented when Circle provides URL → sgid endpoint
  // if (preview && preview.sgid) {
  //   return createEmbedNode(preview.sgid);
  // }

  // Tier 2: Enhanced fallback - thumbnail + link paragraph
  if (preview && preview.thumbnail_url && preview.thumbnail_signed_id) {
    return [
      createImageNode(preview.thumbnail_signed_id, "center"),
      createParagraphNode(`${preview.title || preview.site || url}`, [createLinkMark(url)])
    ];
  }

  // Tier 3: Simple link paragraph (most stable fallback)
  const linkText = preview?.title || preview?.site || extractDomainFromUrl(url);
  return createParagraphNode(linkText, [createLinkMark(url)]);
}

function hasUrlEmbedded(nodes, url) {
  // Check if URL is already embedded in any of the nodes
  return nodes.some(node => {
    if (node.type === 'paragraph' && node.content) {
      return node.content.some(content => 
        content.marks && content.marks.some(mark => 
          mark.type === 'link' && mark.attrs.href === url
        )
      );
    }
    return false;
  });
}

function extractDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return url;
  }
}

// Helper to create rich text with mixed content
function createRichTextParagraph(segments) {
  const content = [];
  
  for (const segment of segments) {
    if (typeof segment === 'string') {
      content.push({
        type: "text",
        text: segment
      });
    } else if (segment.text && segment.marks) {
      content.push({
        type: "text",
        text: segment.text,
        marks: segment.marks
      });
    }
  }
  
  return {
    type: "paragraph",
    content
  };
}

// Validation function to ensure TipTap JSON is well-formed
function validateTipTapDocument(doc) {
  if (!doc || typeof doc !== 'object') {
    throw new Error('Document must be an object');
  }
  
  if (doc.type !== 'doc') {
    throw new Error('Root element must be of type "doc"');
  }
  
  if (!Array.isArray(doc.content)) {
    throw new Error('Document content must be an array');
  }
  
  if (doc.content.length === 0) {
    throw new Error('Document must have at least one content node');
  }
  
  return true;
}

module.exports = {
  createTipTapDocument,
  createParagraphNode,
  createImageNode,
  createEmbedNode,
  createFileNode,
  createAttachmentNode,
  createLinkMark,
  createRichTextParagraph,
  generatePostContent,
  validateTipTapDocument
};
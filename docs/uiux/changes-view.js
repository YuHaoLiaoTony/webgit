// changes-view.js - Content loaded into #changesView
// Loaded via <script src="changes-view.js"></script> in index.html (before app.js)
(function() {
  var html = `<div class="changes-view-toolbar">
  <span class="changes-view-title">📝 Uncommitted Changes</span>
  <span class="changes-view-badge">11 files changed</span>
  <div class="changes-view-actions">
    <span class="changes-view-btn" id="btnStage" onclick="stageSelected()">Stage</span>
    <span class="changes-view-btn" id="btnUnstage" onclick="unstageSelected()">Unstage</span>
    <span class="changes-view-btn" onclick="stageAll()">Stage All</span>
    <span class="changes-view-btn primary" onclick="commitChanges()">Commit…</span>
  </div>
</div>
<div class="changes-view-body">
  <div class="changes-view-files" id="changesViewFiles">
    <!-- Unstaged Changes (top) -->
    <div class="cv-group" id="group-unstaged">
      <div class="cv-group-header">
        <span>Unstaged Changes</span>
        <span class="cv-group-count" id="count-unstaged">8</span>
        <span class="cv-group-btn" onclick="event.stopPropagation(); stageGroup('unstaged')">Stage</span>
      </div>
      <div class="cv-group-body" id="body-unstaged">
        <!-- README.md (root) -->
        <div>
          <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'unstaged-6')" data-change-type="modified" data-file-path="README.md">
            <span class="tree-toggle" style="visibility:hidden">▶</span>
            <span class="cv-file-status cv-status-modified">U</span>
            <span class="tree-icon tree-icon-file">📄</span>
            <span>README.md</span>
            <span class="tree-file-stats"><span class="add">+2</span> <span class="del">-2</span></span>
          </div>
        </div>
        <!-- src/ -->
        <div>
          <div class="changes-tree-item" data-path="src" onclick="toggleChangesTreeNode(this)">
            <span class="tree-toggle expanded">▶</span>
            <span class="tree-icon tree-icon-folder">📁</span>
            <span>src/</span>
          </div>
          <div class="changes-tree-children" id="body-unstaged-src">
            <!-- compiler/ -->
            <div>
              <div class="changes-tree-item" data-path="src/compiler" onclick="toggleChangesTreeNode(this)">
                <span class="tree-toggle expanded">▶</span>
                <span class="tree-icon tree-icon-folder">📁</span>
                <span>compiler/</span>
              </div>
              <div class="changes-tree-children" id="body-unstaged-src-compiler">
                <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'unstaged-4')" data-change-type="modified" data-file-path="src/compiler/scanner.ts">
                  <span class="tree-toggle" style="visibility:hidden">▶</span>
                  <span class="cv-file-status cv-status-modified">U</span>
                  <span class="tree-icon tree-icon-file">📄</span>
                  <span>scanner.ts</span>
                  <span class="tree-file-stats"><span class="add">+3</span> <span class="del">-1</span></span>
                </div>
              </div>
            </div>
            <!-- experimental/ -->
            <div>
              <div class="changes-tree-item" data-path="src/experimental" onclick="toggleChangesTreeNode(this)">
                <span class="tree-toggle expanded">▶</span>
                <span class="tree-icon tree-icon-folder">📁</span>
                <span>experimental/</span>
              </div>
              <div class="changes-tree-children" id="body-unstaged-src-experimental">
                <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'unstaged-7')" data-change-type="added" data-file-path="src/experimental/newFeature.ts">
                  <span class="tree-toggle" style="visibility:hidden">▶</span>
                  <span class="cv-file-status cv-status-added">C</span>
                  <span class="tree-icon tree-icon-file">📄</span>
                  <span>newFeature.ts</span>
                </div>
              </div>
            </div>
            <!-- legacy/ -->
            <div>
              <div class="changes-tree-item" data-path="src/legacy" onclick="toggleChangesTreeNode(this)">
                <span class="tree-toggle expanded">▶</span>
                <span class="tree-icon tree-icon-folder">📁</span>
                <span>legacy/</span>
              </div>
              <div class="changes-tree-children" id="body-unstaged-src-legacy">
                <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'unstaged-5')" data-change-type="deleted" data-file-path="src/legacy/deprecated.ts">
                  <span class="tree-toggle" style="visibility:hidden">▶</span>
                  <span class="cv-file-status cv-status-deleted">D</span>
                  <span class="tree-icon tree-icon-file">📄</span>
                  <span>deprecated.ts</span>
                  <span class="tree-file-stats"><span class="del">-45</span></span>
                </div>
              </div>
            </div>
            <!-- loc/ -->
            <div>
              <div class="changes-tree-item" data-path="src/loc" onclick="toggleChangesTreeNode(this)">
                <span class="tree-toggle expanded">▶</span>
                <span class="tree-icon tree-icon-folder">📁</span>
                <span>loc/</span>
              </div>
              <div class="changes-tree-children" id="body-unstaged-src-loc">
                <!-- lcl/ -->
                <div>
                  <div class="changes-tree-item" data-path="src/loc/lcl" onclick="toggleChangesTreeNode(this)">
                    <span class="tree-toggle expanded">▶</span>
                    <span class="tree-icon tree-icon-folder">📁</span>
                    <span>lcl/</span>
                  </div>
                  <div class="changes-tree-children" id="body-unstaged-src-loc-lcl">
                    <!-- deu/ -->
                    <div>
                      <div class="changes-tree-item" data-path="src/loc/lcl/deu" onclick="toggleChangesTreeNode(this)">
                        <span class="tree-toggle expanded">▶</span>
                        <span class="tree-icon tree-icon-folder">📁</span>
                        <span>deu/</span>
                      </div>
                      <div class="changes-tree-children" id="body-unstaged-src-loc-lcl-deu">
                        <!-- diagnosticMessages/ -->
                        <div>
                          <div class="changes-tree-item" data-path="src/loc/lcl/deu/diagnosticMessages" onclick="toggleChangesTreeNode(this)">
                            <span class="tree-toggle expanded">▶</span>
                            <span class="tree-icon tree-icon-folder">📁</span>
                            <span>diagnosticMessages/</span>
                          </div>
                          <div class="changes-tree-children" id="body-unstaged-src-loc-lcl-deu-diagnosticMessages">
                            <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'unstaged-3')" data-change-type="added" data-file-path="src/loc/lcl/deu/diagnosticMessages/diagnosticMessages.generated.json.lcl">
                              <span class="tree-toggle" style="visibility:hidden">▶</span>
                              <span class="cv-file-status cv-status-added">C</span>
                              <span class="tree-icon tree-icon-file">📄</span>
                              <span>diagnosticMessages.generated.json.lcl</span>
                              <span class="tree-file-stats"><span class="add">+92</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- fra/ -->
                    <div>
                      <div class="changes-tree-item" data-path="src/loc/lcl/fra" onclick="toggleChangesTreeNode(this)">
                        <span class="tree-toggle expanded">▶</span>
                        <span class="tree-icon tree-icon-folder">📁</span>
                        <span>fra/</span>
                      </div>
                      <div class="changes-tree-children" id="body-unstaged-src-loc-lcl-fra">
                        <!-- diagnosticMessages/ -->
                        <div>
                          <div class="changes-tree-item" data-path="src/loc/lcl/fra/diagnosticMessages" onclick="toggleChangesTreeNode(this)">
                            <span class="tree-toggle expanded">▶</span>
                            <span class="tree-icon tree-icon-folder">📁</span>
                            <span>diagnosticMessages/</span>
                          </div>
                          <div class="changes-tree-children" id="body-unstaged-src-loc-lcl-fra-diagnosticMessages">
                            <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'unstaged-1')" data-change-type="modified" data-file-path="src/loc/lcl/fra/diagnosticMessages/diagnosticMessages.generated.json.lcl">
                              <span class="tree-toggle" style="visibility:hidden">▶</span>
                              <span class="cv-file-status cv-status-modified">U</span>
                              <span class="tree-icon tree-icon-file">📄</span>
                              <span>diagnosticMessages.generated.json.lcl</span>
                              <span class="tree-file-stats"><span class="add">+89</span> <span class="del">-12</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <!-- ita/ -->
                    <div>
                      <div class="changes-tree-item" data-path="src/loc/lcl/ita" onclick="toggleChangesTreeNode(this)">
                        <span class="tree-toggle expanded">▶</span>
                        <span class="tree-icon tree-icon-folder">📁</span>
                        <span>ita/</span>
                      </div>
                      <div class="changes-tree-children" id="body-unstaged-src-loc-lcl-ita">
                        <!-- diagnosticMessages/ -->
                        <div>
                          <div class="changes-tree-item" data-path="src/loc/lcl/ita/diagnosticMessages" onclick="toggleChangesTreeNode(this)">
                            <span class="tree-toggle expanded">▶</span>
                            <span class="tree-icon tree-icon-folder">📁</span>
                            <span>diagnosticMessages/</span>
                          </div>
                          <div class="changes-tree-children" id="body-unstaged-src-loc-lcl-ita-diagnosticMessages">
                            <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'unstaged-2')" data-change-type="modified" data-file-path="src/loc/lcl/ita/diagnosticMessages/diagnosticMessages.generated.json.lcl">
                              <span class="tree-toggle" style="visibility:hidden">▶</span>
                              <span class="cv-file-status cv-status-modified">U</span>
                              <span class="tree-icon tree-icon-file">📄</span>
                              <span>diagnosticMessages.generated.json.lcl</span>
                              <span class="tree-file-stats"><span class="add">+65</span> <span class="del">-15</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- shared/ (rename target) -->
            <div>
              <div class="changes-tree-item" data-path="src/shared" onclick="toggleChangesTreeNode(this)">
                <span class="tree-toggle expanded">▶</span>
                <span class="tree-icon tree-icon-folder">📁</span>
                <span>shared/</span>
              </div>
              <div class="changes-tree-children" id="body-unstaged-src-shared">
                <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'unstaged-8')" data-change-type="renamed" data-file-path="src/utils/helpers.ts → src/shared/helpers.ts">
                  <span class="tree-toggle" style="visibility:hidden">▶</span>
                  <span class="cv-file-status cv-status-renamed">M</span>
                  <span class="tree-icon tree-icon-file">📄</span>
                  <span>helpers.ts <span style="color:#999;font-size:10px">← src/utils/</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Staged Changes (bottom) -->
    <div class="cv-group" id="group-staged">
      <div class="cv-group-header" id="cvResizerH">
        <span>Staged Changes</span>
        <span class="cv-group-count" id="count-staged">3</span>
        <span class="cv-group-btn" onclick="event.stopPropagation(); unstageGroup('staged')">Unstage</span>
      </div>
      <div class="cv-group-body" id="body-staged">
        <!-- src/ -->
        <div>
          <div class="changes-tree-item" data-path="src" onclick="toggleChangesTreeNode(this)">
            <span class="tree-toggle expanded">▶</span>
            <span class="tree-icon tree-icon-folder">📁</span>
            <span>src/</span>
          </div>
          <div class="changes-tree-children" id="body-staged-src">
            <!-- compiler/ -->
            <div>
              <div class="changes-tree-item" data-path="src/compiler" onclick="toggleChangesTreeNode(this)">
                <span class="tree-toggle expanded">▶</span>
                <span class="tree-icon tree-icon-folder">📁</span>
                <span>compiler/</span>
              </div>
              <div class="changes-tree-children" id="body-staged-src-compiler">
                <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'staged-1')" data-change-type="modified" data-file-path="src/compiler/checker.ts">
                  <span class="tree-toggle" style="visibility:hidden">▶</span>
                  <span class="cv-file-status cv-status-modified">U</span>
                  <span class="tree-icon tree-icon-file">📄</span>
                  <span>checker.ts</span>
                  <span class="tree-file-stats"><span class="add">+12</span> <span class="del">-4</span></span>
                </div>
                <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'staged-2')" data-change-type="added" data-file-path="src/compiler/newModule.ts">
                  <span class="tree-toggle" style="visibility:hidden">▶</span>
                  <span class="cv-file-status cv-status-added">C</span>
                  <span class="tree-icon tree-icon-file">📄</span>
                  <span>newModule.ts</span>
                  <span class="tree-file-stats"><span class="add">+89</span></span>
                </div>
              </div>
            </div>
            <!-- services/ -->
            <div>
              <div class="changes-tree-item" data-path="src/services" onclick="toggleChangesTreeNode(this)">
                <span class="tree-toggle expanded">▶</span>
                <span class="tree-icon tree-icon-folder">📁</span>
                <span>services/</span>
              </div>
              <div class="changes-tree-children" id="body-staged-src-services">
                <div class="changes-tree-item changes-file-item" onclick="selectChangesViewFile(this, 'staged-3')" data-change-type="modified" data-file-path="src/services/completions.ts">
                  <span class="tree-toggle" style="visibility:hidden">▶</span>
                  <span class="cv-file-status cv-status-modified">U</span>
                  <span class="tree-icon tree-icon-file">📄</span>
                  <span>completions.ts</span>
                  <span class="tree-file-stats"><span class="add">+5</span> <span class="del">-1</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="changes-view-diff" id="changesViewDiff">
    <div class="changes-view-diff-placeholder">← Select a file to view its diff</div>
  </div>
</div>

<!-- Hidden diff templates for Changes View files -->
<div style="display:none" id="cv-diff-unstaged-1">
  <div class="cv-diff-content">
    <div class="diff-file-header">
      <span class="file-status-badge file-status-modified">修改</span>
      <span>src/loc/lcl/fra/diagnosticMessages/diagnosticMessages.generated.json.lcl</span>
    </div>
    <div class="diff-hunk-header">@@ -45,8 +45,12 @@</div>
    <div class="diff-line diff-context"><span class="diff-line-number">45</span>  &lt;Str Cat="Error"&gt;</div>
    <div class="diff-line diff-context"><span class="diff-line-number">46</span>    &lt;Val&gt;Type '{{0}}' has no properties in common with type '{{1}}'.&lt;/Val&gt;</div>
    <div class="diff-line diff-context"><span class="diff-line-number">47</span>    &lt;Tgt&gt;Le type '{{0}}' n'a aucune propriété en commun avec le type '{{1}}'.&lt;/Tgt&gt;</div>
    <div class="diff-line diff-del"><span class="diff-line-number">48</span>-    &lt;Attr Name="helpUrl" /&gt;</div>
    <div class="diff-line diff-add"><span class="diff-line-number">48</span>+    &lt;Attr Name="helpUrl"&gt;https://aka.ms/ts-error-41678&lt;/Attr&gt;</div>
    <div class="diff-line diff-context"><span class="diff-line-number">49</span>    &lt;/Str&gt;</div>
    <div class="diff-line diff-context"><span class="diff-line-number">50</span>  &lt;Str Cat="Error"&gt;</div>
    <div class="diff-line diff-add"><span class="diff-line-number">51</span>+    &lt;Attr Name="helpUrl"&gt;https://aka.ms/ts-error-41678&lt;/Attr&gt;</div>
    <div class="diff-line diff-context"><span class="diff-line-number">52</span>    &lt;Val&gt;Type '{{0}}' is not assignable to type '{{1}}'.&lt;/Val&gt;</div>
  </div>
</div>

<div style="display:none" id="cv-diff-unstaged-4">
  <div class="cv-diff-content">
    <div class="diff-file-header">
      <span class="file-status-badge file-status-modified">修改</span>
      <span>src/compiler/scanner.ts</span>
    </div>
    <div class="diff-hunk-header">@@ -12,7 +12,9 @@</div>
    <div class="diff-line diff-context"><span class="diff-line-number">12</span>    <span class="kw">if</span> (ch === CharacterCodes.space) {</div>
    <div class="diff-line diff-context"><span class="diff-line-number">13</span>      pos++;</div>
    <div class="diff-line diff-context"><span class="diff-line-number">14</span>      <span class="kw">continue</span>;</div>
    <div class="diff-line diff-add"><span class="diff-line-number">15</span>+    <span class="kw">if</span> (ch === CharacterCodes.hash) {</div>
    <div class="diff-line diff-add"><span class="diff-line-number">16</span>+      <span class="kw">return</span> <span class="fn">scanHash</span>();</div>
    <div class="diff-line diff-add"><span class="diff-line-number">17</span>+    }</div>
    <div class="diff-line diff-context"><span class="diff-line-number">18</span>      <span class="kw">if</span> (ch === CharacterCodes.slash) {</div>
    <div class="diff-line diff-context"><span class="diff-line-number">19</span>        <span class="kw">return</span> <span class="fn">scanSlash</span>();</div>
  </div>
</div>

<div style="display:none" id="cv-diff-unstaged-5">
  <div class="cv-diff-content">
    <div class="diff-file-header">
      <span class="file-status-badge file-status-deleted">刪除</span>
      <span>src/legacy/deprecated.ts</span>
    </div>
    <div class="diff-hunk-header">@@ -1,45 +0,0 @@</div>
    <div class="diff-line diff-del"><span class="diff-line-number">1</span>-<span class="cm">// Deprecated — use new API</span></div>
    <div class="diff-line diff-del"><span class="diff-line-number">2</span>-<span class="kw">export</span> <span class="kw">function</span> <span class="fn">legacyFunc</span>() {</div>
    <div class="diff-line diff-del"><span class="diff-line-number">3</span>-  <span class="kw">return</span> <span class="str">"deprecated"</span>;</div>
    <div class="diff-line diff-del"><span class="diff-line-number">4</span>-}</div>
    <div class="diff-line diff-del"><span class="diff-line-number">5</span>-<span class="cm">// ... (41 more lines removed)</span></div>
  </div>
</div>

<div style="display:none" id="cv-diff-unstaged-6">
  <div class="cv-diff-content">
    <div class="diff-file-header">
      <span class="file-status-badge file-status-modified">修改</span>
      <span>README.md</span>
    </div>
    <div class="diff-hunk-header">@@ -1,4 +1,4 @@</div>
    <div class="diff-line diff-del"><span class="diff-line-number">1</span>-# TypeScript</div>
    <div class="diff-line diff-add"><span class="diff-line-number">1</span>+# TypeScript — Fork Demo</div>
    <div class="diff-line diff-context"><span class="diff-line-number">2</span></div>
    <div class="diff-line diff-context"><span class="diff-line-number">3</span>TypeScript is a language for application-scale JavaScript.</div>
    <div class="diff-line diff-context"><span class="diff-line-number">4</span></div>
    <div class="diff-line diff-add"><span class="diff-line-number">5</span>+This is a demo of the Fork git client UI mockup.</div>
  </div>
</div>

<div style="display:none" id="cv-diff-unstaged-7">
  <div class="cv-diff-content">
    <div class="diff-file-header">
      <span class="file-status-badge file-status-added">新增</span>
      <span>src/experimental/newFeature.ts</span>
    </div>
    <div class="diff-hunk-header">@@ -0,0 +1,8 @@</div>
    <div class="diff-line diff-add"><span class="diff-line-number">1</span>+<span class="cm">// New experimental feature</span></div>
    <div class="diff-line diff-add"><span class="diff-line-number">2</span>+<span class="kw">export</span> <span class="kw">function</span> <span class="fn">newFeature</span>() {</div>
    <div class="diff-line diff-add"><span class="diff-line-number">3</span>+  <span class="kw">return</span> <span class="str">"new"</span>;</div>
    <div class="diff-line diff-add"><span class="diff-line-number">4</span>+}</div>
  </div>
</div>

<div style="display:none" id="cv-diff-unstaged-8">
  <div class="cv-diff-content">
    <div class="diff-file-header">
      <span class="file-status-badge file-status-renamed">移動</span>
      <span>src/utils/helpers.ts → src/shared/helpers.ts</span>
    </div>
    <div class="diff-hunk-header">@@ -1,5 +1,5 @@</div>
    <div class="diff-line diff-context"><span class="diff-line-number">1</span> <span class="cm">// Helper utilities</span></div>
    <div class="diff-line diff-context"><span class="diff-line-number">2</span></div>
    <div class="diff-line diff-context"><span class="diff-line-number">3</span> <span class="kw">export</span> <span class="kw">function</span> <span class="fn">format</span>(input: <span class="type">string</span>) {</div>
    <div class="diff-line diff-context"><span class="diff-line-number">4</span>   <span class="kw">return</span> input.<span class="fn">trim</span>();</div>
    <div class="diff-line diff-context"><span class="diff-line-number">5</span> }</div>
    <div class="diff-hunk-header">@@ -10,3 +10,7 @@</div>
    <div class="diff-line diff-add"><span class="diff-line-number">10</span>+<span class="kw">export</span> <span class="kw">function</span> <span class="fn">isValid</span>(val: <span class="type">unknown</span>): <span class="type">boolean</span> {</div>
    <div class="diff-line diff-add"><span class="diff-line-number">11</span>+  <span class="kw">return</span> val !== <span class="kw">null</span> && val !== <span class="kw">undefined</span>;</div>
    <div class="diff-line diff-add"><span class="diff-line-number">12</span>+}</div>
  </div>
</div>

<div style="display:none" id="cv-diff-staged-1">
  <div class="cv-diff-content">
    <div class="diff-file-header">
      <span class="file-status-badge file-status-modified">修改</span>
      <span>src/compiler/checker.ts</span>
    </div>
    <div class="diff-hunk-header">@@ -45,8 +45,12 @@</div>
    <div class="diff-line diff-context"><span class="diff-line-number">45</span>   checker.<span class="fn">checkNode</span>(node, diagnostics);</div>
    <div class="diff-line diff-del"><span class="diff-line-number">46</span>-  <span class="kw">return</span> diagnostics;</div>
    <div class="diff-line diff-add"><span class="diff-line-number">46</span>+  <span class="kw">return</span> diagnostics.<span class="fn">filter</span>(d =&gt; d.severity === <span class="str">"error"</span>);</div>
    <div class="diff-line diff-context"><span class="diff-line-number">47</span> }</div>
  </div>
</div>

<div style="display:none" id="cv-diff-staged-2">
  <div class="cv-diff-content">
    <div class="diff-file-header">
      <span class="file-status-badge file-status-added">新增</span>
      <span>src/compiler/newModule.ts</span>
    </div>
    <div class="diff-hunk-header">@@ -0,0 +1,89 @@</div>
    <div class="diff-line diff-add"><span class="diff-line-number">1</span>+<span class="cm">// New module — checked in</span></div>
    <div class="diff-line diff-add"><span class="diff-line-number">2</span>+<span class="kw">export</span> <span class="kw">function</span> <span class="fn">init</span>() {</div>
    <div class="diff-line diff-add"><span class="diff-line-number">3</span>+  <span class="kw">return</span> <span class="str">"initialized"</span>;</div>
    <div class="diff-line diff-add"><span class="diff-line-number">4</span>+}</div>
  </div>
</div>

<div style="display:none" id="cv-diff-staged-3">
  <div class="cv-diff-content">
    <div class="diff-file-header">
      <span class="file-status-badge file-status-modified">修改</span>
      <span>src/services/completions.ts</span>
    </div>
    <div class="diff-hunk-header">@@ -2,7 +2,11 @@</div>
    <div class="diff-line diff-context"><span class="diff-line-number">2</span>  fileName: <span class="type">string</span>, position: <span class="type">number</span></div>
    <div class="diff-line diff-context"><span class="diff-line-number">3</span>): CompletionEntry[] {</div>
    <div class="diff-line diff-del"><span class="diff-line-number">4</span>-  <span class="kw">const</span> program = <span class="fn">getProgram</span>(fileName);</div>
    <div class="diff-line diff-add"><span class="diff-line-number">4</span>+  <span class="kw">const</span> program = <span class="fn">getOrCreateProgram</span>(fileName);</div>
    <div class="diff-line diff-context"><span class="diff-line-number">5</span>   <span class="kw">const</span> checker = program.<span class="fn">getTypeChecker</span>();</div>
    <div class="diff-line diff-context"><span class="diff-line-number">6</span>   <span class="kw">return</span> checker.<span class="fn">getCompletionsAtPosition</span>(fileName, position);</div>
    <div class="diff-line diff-add"><span class="diff-line-number">7</span>+</div>
    <div class="diff-line diff-add"><span class="diff-line-number">8</span>+  <span class="cm">// Also return snippet completions</span></div>
    <div class="diff-line diff-add"><span class="diff-line-number">9</span>+  <span class="kw">return</span> [...entries, ...<span class="fn">getSnippetCompletions</span>(position)];</div>
  </div>
</div>`;

  var el = document.getElementById('changesView');
  if (el) {
    el.innerHTML = html;
  }
})();

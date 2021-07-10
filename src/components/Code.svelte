<!-- This is REALLY ugly but the only way I could get it to work short of just making a .gif -->
<div>
    <pre id="typewriter">
    <span class='p'>const</span><span class='y'>emojis</span><span class='b nm'> = require</span>(<span class='g nm'>'./emojis.json'</span>);
<span class='p'>const</span><span class='b'> rndEmoji =</span><span>()</span><span class='p'>→</span>{'{'}
    <span class='p'>let</span><span class='r'> emojisObj</span><span class='b'> =</span><span class='y nm'> Object</span>.<span class='b nm'>keys</span>(<span class='r nm'>emojis</span>);
    <span class='p'>let</span><span class='r'>randomKey</span><span class='b'>=</span><span class='r nm'>emojisObj</span>[<span class='y nm'>Math</span>.<span class='b nm'>floor</span>(<span class='y nm'>Math</span>.<span class='b nm'>random</span><span>()</span><span>*</span><span class='y nm'>emojisObj</span>.<span class='r nm'>length</span>)];
    <span class='p'>return</span><span class='r nm'>emojis</span>[<span class='r nm'>randomKey</span>]<span>;</span>
    </pre>
</div>

<style>
#typewriter {
    color: #bbbbbb;
    font-size: 1.1rem;
}
.p {
    color: #f4a0ed;
}
.y {
    color: #f2dd75;
}
.b {
    color: #33bbee;
}
.g {
    color: #21bf90;
}
.r {
    color: #e93c15;
}
span {
    margin-right: 1ch;
}
.nm {
    margin-right: 0;
}
pre {
    text-align: left;
}
div {
    width: 1px;
    height: 217px;
    overflow-x: visible;
    position: relative;
    right: 15em;
}
@media all and (max-width: 1055px) {
    div {
        visibility: hidden;
        width: 0;
        height: 0;
        overflow: hidden;
    }
}
</style>

<script>
    import { onMount } from 'svelte';
    
    onMount(() => {
        function setupTypewriter(t) {
            var HTML = t.innerHTML;
    
            t.innerHTML = "";
    
            var cursorPosition = 0,
                tag = "",
                writingTag = false,
                tagOpen = false,
                typeSpeed = 5,
                tempTypeSpeed = 0;
    
            var type = function() {
            
                if (writingTag === true) {
                    tag += HTML[cursorPosition];
                }
    
                if (HTML[cursorPosition] === "<") {
                    tempTypeSpeed = 0;
                    if (tagOpen) {
                        tagOpen = false;
                        writingTag = true;
                    } else {
                        tag = "";
                        tagOpen = true;
                        writingTag = true;
                        tag += HTML[cursorPosition];
                    }
                }
                if (!writingTag && tagOpen) {
                    tag.innerHTML += HTML[cursorPosition];
                }
                if (!writingTag && !tagOpen) {
                    if (HTML[cursorPosition] === " ") {
                        tempTypeSpeed = 0;
                    }
                    else {
                        tempTypeSpeed = (Math.random() * typeSpeed) + 50;
                    }
                    t.innerHTML += HTML[cursorPosition];
                }
                if (writingTag === true && HTML[cursorPosition] === ">") {
                    tempTypeSpeed = (Math.random() * typeSpeed) + 50;
                    writingTag = false;
                    if (tagOpen) {
                        var newSpan = document.createElement("span");
                        t.appendChild(newSpan);
                        newSpan.innerHTML = tag;
                        tag = newSpan.firstChild;
                    }
                }
    
                cursorPosition += 1;
                if (cursorPosition < HTML.length - 1) {
                    setTimeout(type, tempTypeSpeed);
                }
    
            };
    
            return {
                type: type
            };
        }
    
        var typer = document.getElementById('typewriter');
        let typewriter = setupTypewriter(typer);
        typewriter.type();
    })
    </script>
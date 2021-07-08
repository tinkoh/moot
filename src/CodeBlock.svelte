<!-- This is ugly but it's the only way I could find -->
<main>
    <pre id="typewriter">
    <span class='p'>const</span><span class='y'>emojis</span><span class='b nm'> = require</span>(<span class='g nm'>'./emojis.json'</span>);
<span class='p'>const</span><span class='b'> rndEmoji =</span><span>()</span><span class='p'>→</span>{'{'} <!-- Needs to be unindented for <pre> to work -->
    <span class='p'>let</span><span class='r'> emojisObj</span><span class='b'> =</span><span class='y nm'> Object</span>.<span class='b nm'>keys</span>(<span class='r nm'>emojis</span>);
    <span class='p'>let</span><span class='r'>randomKey</span><span class='b'>=</span><span class='r nm'>emojisObj</span>[<span class='y nm'>Math</span>.<span class='b nm'>floor</span>(<span class='y nm'>Math</span>.<span class='b nm'>random</span><span>()</span><span>*</span><span class='y nm'>emojisObj</span>.<span class='r nm'>length</span>)];
    <span class='p'>return</span><span class='r nm'>emojis</span>[<span class='r nm'>randomKey</span>];
    </pre>
</main>

<style>
#typewriter {
    color: #bbbbbb;
    font-size: 1.1rem;
}
@media all and (max-width: 800px) {
    #typewriter {
        font-size: 0.7rem;
    }
}
@media all and (max-width: 570px) {
    #typewriter {
        font-size: 0.5rem;
    }
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

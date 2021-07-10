
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                start_hydrating();
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Title.svelte generated by Svelte v3.38.3 */

    const file$4 = "src\\components\\Title.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let img;
    	let img_src_value;
    	let t0;
    	let h2;
    	let t2;
    	let h3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "Call your methods with a moot point.";
    			t2 = space();
    			h3 = element("h3");
    			h3.textContent = "Color-blind friendly syntax highlighting.";
    			if (img.src !== (img_src_value = "/moot_logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "moot logo");
    			add_location(img, file$4, 1, 4, 24);
    			attr_dev(h2, "class", "svelte-h4dj2d");
    			add_location(h2, file$4, 2, 4, 72);
    			attr_dev(h3, "class", "svelte-h4dj2d");
    			add_location(h3, file$4, 3, 4, 123);
    			attr_dev(div, "class", "flex svelte-h4dj2d");
    			add_location(div, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    			append_dev(div, t0);
    			append_dev(div, h2);
    			append_dev(div, t2);
    			append_dev(div, h3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Title", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Title> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Title extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Title",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\Body.svelte generated by Svelte v3.38.3 */

    const file$3 = "src\\components\\Body.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let p;
    	let t0;
    	let a;
    	let t2;
    	let t3;
    	let button;
    	let img;
    	let img_src_value;
    	let t4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text("moot is a dark theme designed to maintain syntax distinction for every hacker.\r\n    Its design philosophy is based on the work of ");
    			a = element("a");
    			a.textContent = "Paul Tol";
    			t2 = text(". Try it out!");
    			t3 = space();
    			button = element("button");
    			img = element("img");
    			t4 = text(" Get moot for VSCode");
    			attr_dev(a, "href", "https://personal.sron.nl/~pault/");
    			attr_dev(a, "class", "svelte-fem9k5");
    			add_location(a, file$3, 3, 50, 163);
    			attr_dev(p, "class", "svelte-fem9k5");
    			add_location(p, file$3, 1, 4, 24);
    			if (img.src !== (img_src_value = "/vsc_logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "vscode logo");
    			attr_dev(img, "class", "svelte-fem9k5");
    			add_location(img, file$3, 6, 8, 288);
    			attr_dev(button, "class", "flex transform svelte-fem9k5");
    			add_location(button, file$3, 5, 4, 247);
    			attr_dev(div, "class", "flex svelte-fem9k5");
    			add_location(div, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(p, a);
    			append_dev(p, t2);
    			append_dev(div, t3);
    			append_dev(div, button);
    			append_dev(button, img);
    			append_dev(button, t4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Body", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Body> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Body extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Body",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\Code.svelte generated by Svelte v3.38.3 */
    const file$2 = "src\\components\\Code.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let pre;
    	let span0;
    	let span1;
    	let span2;
    	let t3;
    	let span3;
    	let t5;
    	let span4;
    	let span5;
    	let span6;
    	let span7;
    	let t10_value = "{" + "";
    	let t10;
    	let t11;
    	let span8;
    	let span9;
    	let span10;
    	let span11;
    	let t16;
    	let span12;
    	let t18;
    	let span13;
    	let t20;
    	let span14;
    	let span15;
    	let span16;
    	let span17;
    	let t25;
    	let span18;
    	let t27;
    	let span19;
    	let t29;
    	let span20;
    	let t31;
    	let span21;
    	let span22;
    	let span23;
    	let span24;
    	let t36;
    	let span25;
    	let t38;
    	let span26;
    	let span27;
    	let t41;
    	let span28;
    	let t43;
    	let span29;

    	const block = {
    		c: function create() {
    			div = element("div");
    			pre = element("pre");
    			span0 = element("span");
    			span0.textContent = "const";
    			span1 = element("span");
    			span1.textContent = "emojis";
    			span2 = element("span");
    			span2.textContent = "= require";
    			t3 = text("(");
    			span3 = element("span");
    			span3.textContent = "'./emojis.json'";
    			t5 = text(");\r\n");
    			span4 = element("span");
    			span4.textContent = "const";
    			span5 = element("span");
    			span5.textContent = "rndEmoji =";
    			span6 = element("span");
    			span6.textContent = "()";
    			span7 = element("span");
    			span7.textContent = "→";
    			t10 = text(t10_value);
    			t11 = text("\r\n    ");
    			span8 = element("span");
    			span8.textContent = "let";
    			span9 = element("span");
    			span9.textContent = "emojisObj";
    			span10 = element("span");
    			span10.textContent = "=";
    			span11 = element("span");
    			span11.textContent = "Object";
    			t16 = text(".");
    			span12 = element("span");
    			span12.textContent = "keys";
    			t18 = text("(");
    			span13 = element("span");
    			span13.textContent = "emojis";
    			t20 = text(");\r\n    ");
    			span14 = element("span");
    			span14.textContent = "let";
    			span15 = element("span");
    			span15.textContent = "randomKey";
    			span16 = element("span");
    			span16.textContent = "=";
    			span17 = element("span");
    			span17.textContent = "emojisObj";
    			t25 = text("[");
    			span18 = element("span");
    			span18.textContent = "Math";
    			t27 = text(".");
    			span19 = element("span");
    			span19.textContent = "floor";
    			t29 = text("(");
    			span20 = element("span");
    			span20.textContent = "Math";
    			t31 = text(".");
    			span21 = element("span");
    			span21.textContent = "random";
    			span22 = element("span");
    			span22.textContent = "()";
    			span23 = element("span");
    			span23.textContent = "*";
    			span24 = element("span");
    			span24.textContent = "emojisObj";
    			t36 = text(".");
    			span25 = element("span");
    			span25.textContent = "length";
    			t38 = text(")];\r\n    ");
    			span26 = element("span");
    			span26.textContent = "return";
    			span27 = element("span");
    			span27.textContent = "emojis";
    			t41 = text("[");
    			span28 = element("span");
    			span28.textContent = "randomKey";
    			t43 = text("]");
    			span29 = element("span");
    			span29.textContent = ";";
    			attr_dev(span0, "class", "p svelte-149p129");
    			add_location(span0, file$2, 3, 4, 136);
    			attr_dev(span1, "class", "y svelte-149p129");
    			add_location(span1, file$2, 3, 32, 164);
    			attr_dev(span2, "class", "b nm svelte-149p129");
    			add_location(span2, file$2, 3, 61, 193);
    			attr_dev(span3, "class", "g nm svelte-149p129");
    			add_location(span3, file$2, 3, 98, 230);
    			attr_dev(span4, "class", "p svelte-149p129");
    			add_location(span4, file$2, 4, 0, 275);
    			attr_dev(span5, "class", "b svelte-149p129");
    			add_location(span5, file$2, 4, 28, 303);
    			attr_dev(span6, "class", "svelte-149p129");
    			add_location(span6, file$2, 4, 62, 337);
    			attr_dev(span7, "class", "p svelte-149p129");
    			add_location(span7, file$2, 4, 77, 352);
    			attr_dev(span8, "class", "p svelte-149p129");
    			add_location(span8, file$2, 5, 4, 387);
    			attr_dev(span9, "class", "r svelte-149p129");
    			add_location(span9, file$2, 5, 30, 413);
    			attr_dev(span10, "class", "b svelte-149p129");
    			add_location(span10, file$2, 5, 63, 446);
    			attr_dev(span11, "class", "y nm svelte-149p129");
    			add_location(span11, file$2, 5, 88, 471);
    			attr_dev(span12, "class", "b nm svelte-149p129");
    			add_location(span12, file$2, 5, 122, 505);
    			attr_dev(span13, "class", "r nm svelte-149p129");
    			add_location(span13, file$2, 5, 153, 536);
    			attr_dev(span14, "class", "p svelte-149p129");
    			add_location(span14, file$2, 6, 4, 576);
    			attr_dev(span15, "class", "r svelte-149p129");
    			add_location(span15, file$2, 6, 30, 602);
    			attr_dev(span16, "class", "b svelte-149p129");
    			add_location(span16, file$2, 6, 62, 634);
    			attr_dev(span17, "class", "r nm svelte-149p129");
    			add_location(span17, file$2, 6, 86, 658);
    			attr_dev(span18, "class", "y nm svelte-149p129");
    			add_location(span18, file$2, 6, 122, 694);
    			attr_dev(span19, "class", "b nm svelte-149p129");
    			add_location(span19, file$2, 6, 153, 725);
    			attr_dev(span20, "class", "y nm svelte-149p129");
    			add_location(span20, file$2, 6, 185, 757);
    			attr_dev(span21, "class", "b nm svelte-149p129");
    			add_location(span21, file$2, 6, 216, 788);
    			attr_dev(span22, "class", "svelte-149p129");
    			add_location(span22, file$2, 6, 248, 820);
    			attr_dev(span23, "class", "svelte-149p129");
    			add_location(span23, file$2, 6, 263, 835);
    			attr_dev(span24, "class", "y nm svelte-149p129");
    			add_location(span24, file$2, 6, 277, 849);
    			attr_dev(span25, "class", "r nm svelte-149p129");
    			add_location(span25, file$2, 6, 313, 885);
    			attr_dev(span26, "class", "p svelte-149p129");
    			add_location(span26, file$2, 7, 4, 926);
    			attr_dev(span27, "class", "r nm svelte-149p129");
    			add_location(span27, file$2, 7, 33, 955);
    			attr_dev(span28, "class", "r nm svelte-149p129");
    			add_location(span28, file$2, 7, 66, 988);
    			attr_dev(span29, "class", "svelte-149p129");
    			add_location(span29, file$2, 7, 102, 1024);
    			attr_dev(pre, "id", "typewriter");
    			attr_dev(pre, "class", "svelte-149p129");
    			add_location(pre, file$2, 2, 4, 109);
    			attr_dev(div, "class", "svelte-149p129");
    			add_location(div, file$2, 1, 0, 98);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, pre);
    			append_dev(pre, span0);
    			append_dev(pre, span1);
    			append_dev(pre, span2);
    			append_dev(pre, t3);
    			append_dev(pre, span3);
    			append_dev(pre, t5);
    			append_dev(pre, span4);
    			append_dev(pre, span5);
    			append_dev(pre, span6);
    			append_dev(pre, span7);
    			append_dev(pre, t10);
    			append_dev(pre, t11);
    			append_dev(pre, span8);
    			append_dev(pre, span9);
    			append_dev(pre, span10);
    			append_dev(pre, span11);
    			append_dev(pre, t16);
    			append_dev(pre, span12);
    			append_dev(pre, t18);
    			append_dev(pre, span13);
    			append_dev(pre, t20);
    			append_dev(pre, span14);
    			append_dev(pre, span15);
    			append_dev(pre, span16);
    			append_dev(pre, span17);
    			append_dev(pre, t25);
    			append_dev(pre, span18);
    			append_dev(pre, t27);
    			append_dev(pre, span19);
    			append_dev(pre, t29);
    			append_dev(pre, span20);
    			append_dev(pre, t31);
    			append_dev(pre, span21);
    			append_dev(pre, span22);
    			append_dev(pre, span23);
    			append_dev(pre, span24);
    			append_dev(pre, t36);
    			append_dev(pre, span25);
    			append_dev(pre, t38);
    			append_dev(pre, span26);
    			append_dev(pre, span27);
    			append_dev(pre, t41);
    			append_dev(pre, span28);
    			append_dev(pre, t43);
    			append_dev(pre, span29);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Code", slots, []);

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

    			var type = function () {
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
    					} else {
    						tempTypeSpeed = Math.random() * typeSpeed + 50;
    					}

    					t.innerHTML += HTML[cursorPosition];
    				}

    				if (writingTag === true && HTML[cursorPosition] === ">") {
    					tempTypeSpeed = Math.random() * typeSpeed + 50;
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

    			return { type };
    		}

    		var typer = document.getElementById("typewriter");
    		let typewriter = setupTypewriter(typer);
    		typewriter.type();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Code> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ onMount });
    	return [];
    }

    class Code extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\Footer.svelte generated by Svelte v3.38.3 */

    const file$1 = "src\\components\\Footer.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let span;
    	let t1;
    	let a;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Made with 💙 by Given Suman";
    			t1 = space();
    			a = element("a");
    			img = element("img");
    			add_location(span, file$1, 1, 4, 24);
    			if (img.src !== (img_src_value = "github_logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "github logo");
    			attr_dev(img, "class", "svelte-1j8blas");
    			add_location(img, file$1, 2, 63, 129);
    			attr_dev(a, "class", "transform svelte-1j8blas");
    			attr_dev(a, "href", "https://github.com/tinkoh/moot");
    			add_location(a, file$1, 2, 4, 70);
    			attr_dev(div, "class", "flex svelte-1j8blas");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(div, t1);
    			append_dev(div, a);
    			append_dev(a, img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.3 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let div;
    	let title;
    	let t0;
    	let body;
    	let t1;
    	let code;
    	let t2;
    	let footer;
    	let current;
    	title = new Title({ $$inline: true });
    	body = new Body({ $$inline: true });
    	code = new Code({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(title.$$.fragment);
    			t0 = space();
    			create_component(body.$$.fragment);
    			t1 = space();
    			create_component(code.$$.fragment);
    			t2 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(div, "class", "flex");
    			add_location(div, file, 7, 0, 206);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(title, div, null);
    			append_dev(div, t0);
    			mount_component(body, div, null);
    			append_dev(div, t1);
    			mount_component(code, div, null);
    			append_dev(div, t2);
    			mount_component(footer, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(title.$$.fragment, local);
    			transition_in(body.$$.fragment, local);
    			transition_in(code.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(title.$$.fragment, local);
    			transition_out(body.$$.fragment, local);
    			transition_out(code.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(title);
    			destroy_component(body);
    			destroy_component(code);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Title, Body, Code, Footer });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map

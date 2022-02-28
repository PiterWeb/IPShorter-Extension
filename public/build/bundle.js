
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
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
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.2' }, detail), true));
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const uri = 'https://ipshorter.herokuapp.com';

    const URLSended = writable(false);

    const ApiKey = writable((localStorage.getItem("apiKey")) ? localStorage.getItem("apiKey") : "");

    const ApiKeyRequest = writable(false);

    const LoggerReq = writable(false);

    const Logger = writable("");

    ApiKey.subscribe(value => {
        if (value) {
            localStorage.setItem("apiKey", value);
        }
    });

    /* src\components\Fotter.svelte generated by Svelte v3.46.2 */
    const file$6 = "src\\components\\Fotter.svelte";

    function create_fragment$6(ctx) {
    	let footer;
    	let a;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			a = element("a");
    			a.textContent = "PiterDev";
    			t1 = space();
    			button = element("button");
    			button.textContent = "Get / Set ApiKey";
    			attr_dev(a, "href", "https://github.com/piterweb");
    			attr_dev(a, "class", "hover:no-underline");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$6, 11, 2, 281);
    			attr_dev(button, "class", "border-0 text-blue-700 hover:text-blue-600 underline bg-transparent");
    			add_location(button, file$6, 13, 2, 380);
    			attr_dev(footer, "class", "bg-gray-300 text-md font-bold text-center");
    			add_location(footer, file$6, 10, 0, 219);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, a);
    			append_dev(footer, t1);
    			append_dev(footer, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleApiKey*/ ctx[0], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $URLSended;
    	validate_store(URLSended, 'URLSended');
    	component_subscribe($$self, URLSended, $$value => $$invalidate(1, $URLSended = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Fotter', slots, []);

    	const handleApiKey = () => {
    		ApiKeyRequest.update(bool => !bool);
    		if ($URLSended) URLSended.set(false);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Fotter> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ApiKeyRequest,
    		URLSended,
    		handleApiKey,
    		$URLSended
    	});

    	return [handleApiKey];
    }

    class Fotter extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Fotter",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\components\Header.svelte generated by Svelte v3.46.2 */

    const file$5 = "src\\components\\Header.svelte";

    function create_fragment$5(ctx) {
    	let header;

    	const block = {
    		c: function create() {
    			header = element("header");
    			header.textContent = "IPShorter";
    			attr_dev(header, "class", "bg-gray-300 text-gray-900 text-2xl p-3 font-bold mb-4 text-center");
    			add_location(header, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\components\ApiKeyView.svelte generated by Svelte v3.46.2 */
    const file$4 = "src\\components\\ApiKeyView.svelte";

    function create_fragment$4(ctx) {
    	let label0;
    	let t1;
    	let div0;
    	let input0;
    	let t2;
    	let button0;
    	let t4;
    	let hr;
    	let t5;
    	let box;
    	let p;
    	let t6;
    	let t7;
    	let label1;
    	let t9;
    	let div1;
    	let input1;
    	let t10;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			label0.textContent = "Set your API Key";
    			t1 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t2 = space();
    			button0 = element("button");
    			button0.textContent = "Submit";
    			t4 = space();
    			hr = element("hr");
    			t5 = space();
    			box = element("box");
    			p = element("p");
    			t6 = text(/*message*/ ctx[2]);
    			t7 = space();
    			label1 = element("label");
    			label1.textContent = "Get Key";
    			t9 = space();
    			div1 = element("div");
    			input1 = element("input");
    			t10 = space();
    			button1 = element("button");
    			button1.textContent = "Send ApiKey";
    			attr_dev(label0, "for", "apiKey");
    			attr_dev(label0, "class", "font-bold");
    			add_location(label0, file$4, 33, 0, 596);
    			attr_dev(input0, "name", "apiKey");
    			attr_dev(input0, "class", "px-1 bg-gray-300 min-w-full");
    			attr_dev(input0, "placeholder", "Enter your API Key");
    			add_location(input0, file$4, 35, 2, 693);
    			attr_dev(button0, "class", "bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 ml-1 px-4 rounded");
    			add_location(button0, file$4, 42, 2, 831);
    			attr_dev(div0, "class", "flex flox-row");
    			add_location(div0, file$4, 34, 0, 662);
    			attr_dev(hr, "class", "my-4");
    			add_location(hr, file$4, 48, 0, 983);
    			attr_dev(p, "class", "font-bold text-red-500");
    			add_location(p, file$4, 51, 2, 1015);
    			add_location(box, file$4, 50, 0, 1006);
    			attr_dev(label1, "for", "mail");
    			attr_dev(label1, "class", "font-bold");
    			add_location(label1, file$4, 54, 0, 1074);
    			attr_dev(input1, "name", "mail");
    			attr_dev(input1, "class", "px-1 bg-gray-300");
    			attr_dev(input1, "placeholder", "Enter your email");
    			add_location(input1, file$4, 56, 2, 1171);
    			attr_dev(button1, "class", "bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 ml-1 px-4 rounded");
    			add_location(button1, file$4, 63, 2, 1295);
    			attr_dev(div1, "class", "flex flex-row align-middle");
    			add_location(div1, file$4, 55, 0, 1127);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			append_dev(div0, input0);
    			set_input_value(input0, /*key*/ ctx[0]);
    			append_dev(div0, t2);
    			append_dev(div0, button0);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, box, anchor);
    			append_dev(box, p);
    			append_dev(p, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, label1, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input1);
    			set_input_value(input1, /*mail*/ ctx[1]);
    			append_dev(div1, t10);
    			append_dev(div1, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[5]),
    					listen_dev(button0, "click", /*setApiKey*/ ctx[3], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[6]),
    					listen_dev(button1, "click", /*sendMail*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*key*/ 1 && input0.value !== /*key*/ ctx[0]) {
    				set_input_value(input0, /*key*/ ctx[0]);
    			}

    			if (dirty & /*message*/ 4) set_data_dev(t6, /*message*/ ctx[2]);

    			if (dirty & /*mail*/ 2 && input1.value !== /*mail*/ ctx[1]) {
    				set_input_value(input1, /*mail*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(box);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(label1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
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

    function instance$4($$self, $$props, $$invalidate) {
    	let $ApiKey;
    	validate_store(ApiKey, 'ApiKey');
    	component_subscribe($$self, ApiKey, $$value => $$invalidate(7, $ApiKey = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ApiKeyView', slots, []);
    	let key, mail, message = "";
    	if ($ApiKey) key = $ApiKey;

    	const setApiKey = () => {
    		ApiKey.set(key);
    	};

    	const sendMail = () => {
    		let formData = new FormData();
    		formData.append("email", mail);

    		fetch(`${uri}/api/getApiKey`, { method: "POST", body: formData }).then(res => res.json()).then(res => {
    			$$invalidate(1, mail = "");
    			$$invalidate(2, message = res.message);
    		}).catch(err => {
    			alert(err);
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ApiKeyView> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		key = this.value;
    		$$invalidate(0, key);
    	}

    	function input1_input_handler() {
    		mail = this.value;
    		$$invalidate(1, mail);
    	}

    	$$self.$capture_state = () => ({
    		ApiKey,
    		uri,
    		key,
    		mail,
    		message,
    		setApiKey,
    		sendMail,
    		$ApiKey
    	});

    	$$self.$inject_state = $$props => {
    		if ('key' in $$props) $$invalidate(0, key = $$props.key);
    		if ('mail' in $$props) $$invalidate(1, mail = $$props.mail);
    		if ('message' in $$props) $$invalidate(2, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		key,
    		mail,
    		message,
    		setApiKey,
    		sendMail,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class ApiKeyView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ApiKeyView",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\CreateLogger.svelte generated by Svelte v3.46.2 */
    const file$3 = "src\\components\\CreateLogger.svelte";

    function create_fragment$3(ctx) {
    	let label;
    	let t1;
    	let div;
    	let input;
    	let t2;
    	let button;
    	let t4;
    	let box;
    	let p;
    	let t5;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label = element("label");
    			label.textContent = "Target URL";
    			t1 = space();
    			div = element("div");
    			input = element("input");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			t4 = space();
    			box = element("box");
    			p = element("p");
    			t5 = text(/*err*/ ctx[0]);
    			attr_dev(label, "for", "t-url");
    			attr_dev(label, "class", "font-bold");
    			add_location(label, file$3, 38, 0, 750);
    			attr_dev(input, "name", "t-url");
    			attr_dev(input, "class", "px-1 bg-gray-300");
    			attr_dev(input, "placeholder", "https://example.com");
    			add_location(input, file$3, 40, 4, 842);
    			attr_dev(button, "class", "bg-blue-500 hover:bg-blue-400 text-white font-bold ml-1 py-2 px-4 rounded-r");
    			add_location(button, file$3, 47, 4, 983);
    			attr_dev(div, "class", "flex flex-row");
    			add_location(div, file$3, 39, 2, 809);
    			attr_dev(p, "class", "font-bold text-red-500");
    			add_location(p, file$3, 56, 4, 1158);
    			add_location(box, file$3, 55, 2, 1147);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*originalURL*/ ctx[1]);
    			append_dev(div, t2);
    			append_dev(div, button);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, box, anchor);
    			append_dev(box, p);
    			append_dev(p, t5);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    					listen_dev(button, "click", /*sendURL*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*originalURL*/ 2 && input.value !== /*originalURL*/ ctx[1]) {
    				set_input_value(input, /*originalURL*/ ctx[1]);
    			}

    			if (dirty & /*err*/ 1) set_data_dev(t5, /*err*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(box);
    			mounted = false;
    			run_all(dispose);
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

    function instance$3($$self, $$props, $$invalidate) {
    	let $ApiKey;
    	validate_store(ApiKey, 'ApiKey');
    	component_subscribe($$self, ApiKey, $$value => $$invalidate(4, $ApiKey = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CreateLogger', slots, []);
    	let err = '';
    	let originalURL = "";

    	const sendURL = () => {
    		URLSended.set(false);
    		LoggerReq.set(false);
    		if (!$ApiKey) $$invalidate(0, err = "Api Key is not set");
    		let formData = new FormData();
    		formData.append('url', originalURL);

    		fetch(`${uri}/api/createLogger/` + $ApiKey, { method: 'POST', body: formData }).then(res => res.json()).then(({ Id }) => {
    			URLSended.set(true);
    			LoggerReq.set(true);
    			Logger.set(Id);
    		}).catch(() => {
    			$$invalidate(0, err = "Error al obtener las URLs");
    		});

    		$$invalidate(1, originalURL = "");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CreateLogger> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		originalURL = this.value;
    		$$invalidate(1, originalURL);
    	}

    	$$self.$capture_state = () => ({
    		ApiKey,
    		URLSended,
    		uri,
    		LoggerReq,
    		Logger,
    		err,
    		originalURL,
    		sendURL,
    		$ApiKey
    	});

    	$$self.$inject_state = $$props => {
    		if ('err' in $$props) $$invalidate(0, err = $$props.err);
    		if ('originalURL' in $$props) $$invalidate(1, originalURL = $$props.originalURL);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [err, originalURL, sendURL, input_input_handler];
    }

    class CreateLogger extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CreateLogger",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\LoggerView.svelte generated by Svelte v3.46.2 */

    const { console: console_1$1 } = globals;
    const file$2 = "src\\components\\LoggerView.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	child_ctx[7] = i;
    	return child_ctx;
    }

    // (79:0) {:catch err}
    function create_catch_block$1(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let t3_value = /*err*/ ctx[8] + "";
    	let t3;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Error loading logger ");
    			t1 = text(/*$Logger*/ ctx[0]);
    			t2 = text(" : ");
    			t3 = text(t3_value);
    			attr_dev(p, "class", "font-bold text-red-500");
    			add_location(p, file$2, 79, 2, 2279);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$Logger*/ 1) set_data_dev(t1, /*$Logger*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$1.name,
    		type: "catch",
    		source: "(79:0) {:catch err}",
    		ctx
    	});

    	return block;
    }

    // (39:0) {:then logger}
    function create_then_block$1(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let h3;
    	let t0;
    	let t1_value = /*logger*/ ctx[4].Id + "";
    	let t1;
    	let t2;
    	let p0;
    	let span0;
    	let t4;
    	let a;
    	let t5_value = uri + "/" + /*logger*/ ctx[4].Id + "";
    	let t5;
    	let t6;
    	let p1;
    	let span1;
    	let t8;
    	let t9_value = /*logger*/ ctx[4].Clicks + "";
    	let t9;
    	let t10;
    	let p2;
    	let span2;
    	let t12;
    	let t13;
    	let p3;
    	let span3;
    	let t15;
    	let t16_value = /*logger*/ ctx[4].Url + "";
    	let t16;
    	let t17;
    	let p4;
    	let button;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*logger*/ ctx[4].Visitors) return create_if_block$2;
    		return create_else_block_1$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			t0 = text("Logger ");
    			t1 = text(t1_value);
    			t2 = space();
    			p0 = element("p");
    			span0 = element("span");
    			span0.textContent = "Shorted URL:";
    			t4 = space();
    			a = element("a");
    			t5 = text(t5_value);
    			t6 = space();
    			p1 = element("p");
    			span1 = element("span");
    			span1.textContent = "Clicks:";
    			t8 = space();
    			t9 = text(t9_value);
    			t10 = space();
    			p2 = element("p");
    			span2 = element("span");
    			span2.textContent = "Visitors:";
    			t12 = space();
    			if_block.c();
    			t13 = space();
    			p3 = element("p");
    			span3 = element("span");
    			span3.textContent = "Url:";
    			t15 = space();
    			t16 = text(t16_value);
    			t17 = space();
    			p4 = element("p");
    			button = element("button");
    			button.textContent = "Delete Logger";
    			attr_dev(h3, "class", "text-xl text-gray-700 mb-2");
    			add_location(h3, file$2, 43, 8, 1071);
    			attr_dev(span0, "class", "font-bold");
    			add_location(span0, file$2, 45, 10, 1180);
    			attr_dev(a, "href", uri + "/" + /*logger*/ ctx[4].Id);
    			add_location(a, file$2, 45, 54, 1224);
    			attr_dev(p0, "class", "text-gray-600");
    			add_location(p0, file$2, 44, 8, 1143);
    			attr_dev(span1, "class", "font-bold");
    			add_location(span1, file$2, 48, 10, 1344);
    			attr_dev(p1, "class", "text-gray-600");
    			add_location(p1, file$2, 47, 8, 1307);
    			attr_dev(span2, "class", "font-bold");
    			add_location(span2, file$2, 51, 10, 1459);
    			attr_dev(p2, "class", "text-gray-600");
    			add_location(p2, file$2, 50, 8, 1422);
    			attr_dev(span3, "class", "font-bold");
    			add_location(span3, file$2, 69, 10, 1979);
    			attr_dev(p3, "class", "text-gray-600");
    			add_location(p3, file$2, 68, 8, 1942);
    			attr_dev(button, "class", "bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 rounded");
    			add_location(button, file$2, 73, 10, 2090);
    			attr_dev(p4, "class", "text-gray-600");
    			add_location(p4, file$2, 72, 8, 2053);
    			attr_dev(div0, "class", "bg-gray-300 p-4");
    			add_location(div0, file$2, 42, 6, 1032);
    			attr_dev(div1, "class", "col-span-1");
    			add_location(div1, file$2, 41, 4, 1000);
    			attr_dev(div2, "class", "grid grid-cols-1 mb-10");
    			add_location(div2, file$2, 40, 2, 958);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h3);
    			append_dev(h3, t0);
    			append_dev(h3, t1);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			append_dev(p0, span0);
    			append_dev(p0, t4);
    			append_dev(p0, a);
    			append_dev(a, t5);
    			append_dev(div0, t6);
    			append_dev(div0, p1);
    			append_dev(p1, span1);
    			append_dev(p1, t8);
    			append_dev(p1, t9);
    			append_dev(div0, t10);
    			append_dev(div0, p2);
    			append_dev(p2, span2);
    			append_dev(p2, t12);
    			if_block.m(p2, null);
    			append_dev(div0, t13);
    			append_dev(div0, p3);
    			append_dev(p3, span3);
    			append_dev(p3, t15);
    			append_dev(p3, t16);
    			append_dev(div0, t17);
    			append_dev(div0, p4);
    			append_dev(p4, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*deleteLogger*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$1.name,
    		type: "then",
    		source: "(39:0) {:then logger}",
    		ctx
    	});

    	return block;
    }

    // (65:10) {:else}
    function create_else_block_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("No visitors");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(65:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (53:10) {#if logger.Visitors}
    function create_if_block$2(ctx) {
    	let t0;
    	let t1;
    	let each_value = /*logger*/ ctx[4].Visitors;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			t0 = text("[");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = text("]");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*fetchLogger*/ 2) {
    				each_value = /*logger*/ ctx[4].Visitors;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t1.parentNode, t1);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(53:10) {#if logger.Visitors}",
    		ctx
    	});

    	return block;
    }

    // (57:10) {:else}
    function create_else_block$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Uknown visitor");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(57:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (55:10) {#if visitor.Ip != null}
    function create_if_block_2$1(ctx) {
    	let t_value = /*visitor*/ ctx[5].Ip + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(55:10) {#if visitor.Ip != null}",
    		ctx
    	});

    	return block;
    }

    // (61:10) {#if i !== logger.Visitors.length - 1}
    function create_if_block_1$1(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = ",";
    			add_location(span, file$2, 61, 12, 1804);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(61:10) {#if i !== logger.Visitors.length - 1}",
    		ctx
    	});

    	return block;
    }

    // (54:11) {#each logger.Visitors as visitor , i}
    function create_each_block$1(ctx) {
    	let t0;
    	let t1_value = /*visitor*/ ctx[5].Clicked + "";
    	let t1;
    	let t2;
    	let t3;

    	function select_block_type_1(ctx, dirty) {
    		if (/*visitor*/ ctx[5].Ip != null) return create_if_block_2$1;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*i*/ ctx[7] !== /*logger*/ ctx[4].Visitors.length - 1 && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			if_block0.c();
    			t0 = text("\r\n          at ");
    			t1 = text(t1_value);
    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    		},
    		m: function mount(target, anchor) {
    			if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t3, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if_block0.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(54:11) {#each logger.Visitors as visitor , i}",
    		ctx
    	});

    	return block;
    }

    // (37:20)     <h3>Loading logger ...</h3>  {:then logger}
    function create_pending_block$1(ctx) {
    	let h3;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Loading logger ...";
    			add_location(h3, file$2, 37, 2, 909);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$1.name,
    		type: "pending",
    		source: "(37:20)     <h3>Loading logger ...</h3>  {:then logger}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let await_block_anchor;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block$1,
    		then: create_then_block$1,
    		catch: create_catch_block$1,
    		value: 4,
    		error: 8
    	};

    	handle_promise(/*fetchLogger*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
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
    	let $Logger;
    	let $ApiKey;
    	validate_store(Logger, 'Logger');
    	component_subscribe($$self, Logger, $$value => $$invalidate(0, $Logger = $$value));
    	validate_store(ApiKey, 'ApiKey');
    	component_subscribe($$self, ApiKey, $$value => $$invalidate(3, $ApiKey = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LoggerView', slots, []);

    	const fetchLogger = (async () => {
    		const response = await fetch(uri + "/api/getLogger/" + $ApiKey + "/" + $Logger);

    		if (response.status !== (200 )) {
    			console.error(`Status :${response.status} on response`);
    			return {};
    		}

    		const data = await response.json();
    		return data;
    	})();

    	const deleteLogger = async () => {
    		const response = await fetch(uri + "/api/deleteLogger/" + $ApiKey + "/" + $Logger, { method: "DELETE" });
    		const data = await response.json();

    		if (response.status !== (200 )) {
    			console.error(data);
    			return;
    		}

    		Logger.set("");
    		LoggerReq.set(false);
    		URLSended.set(false);
    		window.location.reload();
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<LoggerView> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		LoggerReq,
    		ApiKey,
    		Logger,
    		uri,
    		URLSended,
    		fetchLogger,
    		deleteLogger,
    		$Logger,
    		$ApiKey
    	});

    	return [$Logger, fetchLogger, deleteLogger];
    }

    class LoggerView extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LoggerView",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\LoggerList.svelte generated by Svelte v3.46.2 */

    const { Error: Error_1, console: console_1 } = globals;
    const file$1 = "src\\components\\LoggerList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (90:0) {:catch error}
    function create_catch_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*error*/ ctx[10] + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Error loading loggers: ");
    			t1 = text(t1_value);
    			attr_dev(p, "class", "font-bold text-red-500");
    			add_location(p, file$1, 90, 2, 2654);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(90:0) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (35:0) {:then data}
    function create_then_block(ctx) {
    	let div4;
    	let div0;
    	let h30;
    	let strong0;
    	let t1;
    	let div1;
    	let h31;
    	let strong1;
    	let t3;
    	let div2;
    	let h32;
    	let strong2;
    	let t5;
    	let div3;
    	let h33;
    	let strong3;
    	let t7;
    	let each_value = /*data*/ ctx[6];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			h30 = element("h3");
    			strong0 = element("strong");
    			strong0.textContent = "Shorted URL";
    			t1 = space();
    			div1 = element("div");
    			h31 = element("h3");
    			strong1 = element("strong");
    			strong1.textContent = "Clicks";
    			t3 = space();
    			div2 = element("div");
    			h32 = element("h3");
    			strong2 = element("strong");
    			strong2.textContent = "Last Visitor";
    			t5 = space();
    			div3 = element("div");
    			h33 = element("h3");
    			strong3 = element("strong");
    			strong3.textContent = "Url";
    			t7 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(strong0, file$1, 37, 10, 946);
    			add_location(h30, file$1, 37, 6, 942);
    			set_style(div0, "order", "1");
    			attr_dev(div0, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div0, file$1, 36, 4, 892);
    			add_location(strong1, file$1, 40, 10, 1051);
    			add_location(h31, file$1, 40, 6, 1047);
    			set_style(div1, "order", "1");
    			attr_dev(div1, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div1, file$1, 39, 4, 997);
    			add_location(strong2, file$1, 43, 10, 1151);
    			add_location(h32, file$1, 43, 6, 1147);
    			set_style(div2, "order", "1");
    			attr_dev(div2, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div2, file$1, 42, 4, 1097);
    			add_location(strong3, file$1, 46, 10, 1257);
    			add_location(h33, file$1, 46, 6, 1253);
    			set_style(div3, "order", "1");
    			attr_dev(div3, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div3, file$1, 45, 4, 1203);
    			attr_dev(div4, "class", "Rtable Rtable--4cols svelte-1kxr0ha");
    			add_location(div4, file$1, 35, 2, 852);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, h30);
    			append_dev(h30, strong0);
    			append_dev(div4, t1);
    			append_dev(div4, div1);
    			append_dev(div1, h31);
    			append_dev(h31, strong1);
    			append_dev(div4, t3);
    			append_dev(div4, div2);
    			append_dev(div2, h32);
    			append_dev(h32, strong2);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, h33);
    			append_dev(h33, strong3);
    			append_dev(div4, t7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*fetchLoggers, goto, uri*/ 6) {
    				each_value = /*data*/ ctx[6];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(35:0) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (65:6) {:else}
    function create_else_block_1(ctx) {
    	let div;
    	let h3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "0";
    			attr_dev(h3, "class", "valueTable svelte-1kxr0ha");
    			add_location(h3, file$1, 66, 10, 1960);
    			set_style(div, "order", "2");
    			attr_dev(div, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div, file$1, 65, 8, 1906);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(65:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (61:6) {#if logger.Clicks}
    function create_if_block_2(ctx) {
    	let div;
    	let h3;
    	let t_value = /*logger*/ ctx[7].Clicks + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "valueTable svelte-1kxr0ha");
    			add_location(h3, file$1, 62, 10, 1822);
    			set_style(div, "order", "2");
    			attr_dev(div, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div, file$1, 61, 8, 1768);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(61:6) {#if logger.Clicks}",
    		ctx
    	});

    	return block;
    }

    // (76:6) {:else}
    function create_else_block$1(ctx) {
    	let div;
    	let h3;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			h3.textContent = "No Visitor";
    			attr_dev(h3, "class", "valueTabl");
    			add_location(h3, file$1, 77, 10, 2320);
    			set_style(div, "order", "2");
    			attr_dev(div, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div, file$1, 76, 8, 2266);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(76:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (70:6) {#if logger.Visitors?.length > 0}
    function create_if_block_1(ctx) {
    	let div;
    	let h3;
    	let t_value = /*logger*/ ctx[7].Visitors[/*logger*/ ctx[7].Visitors.length - 1].IP + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h3 = element("h3");
    			t = text(t_value);
    			attr_dev(h3, "class", "valueTable svelte-1kxr0ha");
    			add_location(h3, file$1, 71, 10, 2123);
    			set_style(div, "order", "2");
    			attr_dev(div, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div, file$1, 70, 8, 2069);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h3);
    			append_dev(h3, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(70:6) {#if logger.Visitors?.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (50:4) {#each data as logger}
    function create_each_block(ctx) {
    	let div0;
    	let a0;
    	let t0_value = /*logger*/ ctx[7].Id + "";
    	let t0;
    	let button;
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let a1;
    	let t5_value = /*logger*/ ctx[7].Url + "";
    	let t5;
    	let t6;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[3](/*logger*/ ctx[7]);
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*logger*/ ctx[7].Clicks) return create_if_block_2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*logger*/ ctx[7].Visitors?.length > 0) return create_if_block_1;
    		return create_else_block$1;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			a0 = element("a");
    			t0 = text(t0_value);
    			button = element("button");
    			button.textContent = "More";
    			t2 = space();
    			if_block0.c();
    			t3 = space();
    			if_block1.c();
    			t4 = space();
    			div1 = element("div");
    			a1 = element("a");
    			t5 = text(t5_value);
    			t6 = space();
    			attr_dev(a0, "href", uri + "/" + /*logger*/ ctx[7].Id);
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "valueTable text-blue-400 visited:text-blue-400 svelte-1kxr0ha");
    			add_location(a0, file$1, 51, 8, 1384);
    			attr_dev(button, "class", "bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 ml-[4px] px-3 rounded");
    			add_location(button, file$1, 55, 9, 1545);
    			set_style(div0, "order", "2");
    			attr_dev(div0, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div0, file$1, 50, 6, 1332);
    			attr_dev(a1, "href", /*logger*/ ctx[7].Url);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "class", "valueTable text-blue-400 visited:text-blue-400 svelte-1kxr0ha");
    			add_location(a1, file$1, 81, 8, 2446);
    			set_style(div1, "order", "2");
    			attr_dev(div1, "class", "Rtable-cell svelte-1kxr0ha");
    			add_location(div1, file$1, 80, 6, 2394);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, a0);
    			append_dev(a0, t0);
    			append_dev(div0, button);
    			insert_dev(target, t2, anchor);
    			if_block0.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			if_block1.m(target, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, a1);
    			append_dev(a1, t5);
    			append_dev(div1, t6);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if_block0.p(ctx, dirty);
    			if_block1.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t2);
    			if_block0.d(detaching);
    			if (detaching) detach_dev(t3);
    			if_block1.d(detaching);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(50:4) {#each data as logger}",
    		ctx
    	});

    	return block;
    }

    // (31:21)     <p class="font-bold text-center my-2">      No loggers found or still searching it    </p>  {:then data}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No loggers found or still searching it";
    			attr_dev(p, "class", "font-bold text-center my-2");
    			add_location(p, file$1, 31, 2, 744);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(31:21)     <p class=\\\"font-bold text-center my-2\\\">      No loggers found or still searching it    </p>  {:then data}",
    		ctx
    	});

    	return block;
    }

    // (94:0) {#if $LoggerReq}
    function create_if_block$1(ctx) {
    	let loggerview;
    	let current;
    	loggerview = new LoggerView({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loggerview.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loggerview, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loggerview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loggerview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loggerview, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(94:0) {#if $LoggerReq}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t;
    	let if_block_anchor;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 6,
    		error: 10
    	};

    	handle_promise(/*fetchLoggers*/ ctx[2], info);
    	let if_block = /*$LoggerReq*/ ctx[0] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			info.block.c();
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => t.parentNode;
    			info.anchor = t;
    			insert_dev(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);

    			if (/*$LoggerReq*/ ctx[0]) {
    				if (if_block) {
    					if (dirty & /*$LoggerReq*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    			if (detaching) detach_dev(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let $ApiKey;
    	let $Logger;
    	let $LoggerReq;
    	validate_store(ApiKey, 'ApiKey');
    	component_subscribe($$self, ApiKey, $$value => $$invalidate(4, $ApiKey = $$value));
    	validate_store(Logger, 'Logger');
    	component_subscribe($$self, Logger, $$value => $$invalidate(5, $Logger = $$value));
    	validate_store(LoggerReq, 'LoggerReq');
    	component_subscribe($$self, LoggerReq, $$value => $$invalidate(0, $LoggerReq = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LoggerList', slots, []);

    	const goto = id => {
    		if ($Logger == id) {
    			LoggerReq.update(value => !value);
    			Logger.set("");
    		} else {
    			LoggerReq.set(false);
    			Logger.set(id);

    			setTimeout(
    				() => {
    					LoggerReq.set(true);
    				},
    				100
    			);
    		}
    	};

    	const fetchLoggers = (async () => {
    		const response = await fetch(`${uri}/api/getLoggers/` + $ApiKey);
    		const data = await response.json();

    		if (response.status !== (200 )) {
    			console.error(data);
    			throw new Error(data.message);
    		}

    		return data;
    	})();

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<LoggerList> was created with unknown prop '${key}'`);
    	});

    	const click_handler = logger => goto(logger.Id);

    	$$self.$capture_state = () => ({
    		LoggerView,
    		uri,
    		ApiKey,
    		LoggerReq,
    		Logger,
    		goto,
    		fetchLoggers,
    		$ApiKey,
    		$Logger,
    		$LoggerReq
    	});

    	return [$LoggerReq, goto, fetchLoggers, click_handler];
    }

    class LoggerList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LoggerList",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.46.2 */
    const file = "src\\App.svelte";

    // (30:4) {:else}
    function create_else_block(ctx) {
    	let createlogger;
    	let current;
    	createlogger = new CreateLogger({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(createlogger.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(createlogger, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(createlogger.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(createlogger.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(createlogger, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(30:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (26:4) {#if $ApiKeyRequest}
    function create_if_block(ctx) {
    	let apikeyview;
    	let current;
    	apikeyview = new ApiKeyView({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(apikeyview.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(apikeyview, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(apikeyview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(apikeyview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(apikeyview, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(26:4) {#if $ApiKeyRequest}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let t0;
    	let article;
    	let current_block_type_index;
    	let if_block;
    	let t1;
    	let loggerlist;
    	let t2;
    	let fotter;
    	let current;
    	header = new Header({ $$inline: true });
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$ApiKeyRequest*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	loggerlist = new LoggerList({ $$inline: true });
    	fotter = new Fotter({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t0 = space();
    			article = element("article");
    			if_block.c();
    			t1 = space();
    			create_component(loggerlist.$$.fragment);
    			t2 = space();
    			create_component(fotter.$$.fragment);
    			attr_dev(article, "class", "py-4 px-60 overflow-hidden mx-auto container");
    			add_location(article, file, 23, 2, 571);
    			attr_dev(main, "class", "overflow-hidden px60 py-10 bg-gray-600 border-4 border-warm-gray-400 rounded");
    			add_location(main, file, 17, 0, 460);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t0);
    			append_dev(main, article);
    			if_blocks[current_block_type_index].m(article, null);
    			append_dev(main, t1);
    			mount_component(loggerlist, main, null);
    			append_dev(main, t2);
    			mount_component(fotter, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(article, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(loggerlist.$$.fragment, local);
    			transition_in(fotter.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(loggerlist.$$.fragment, local);
    			transition_out(fotter.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			if_blocks[current_block_type_index].d();
    			destroy_component(loggerlist);
    			destroy_component(fotter);
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
    	let $ApiKeyRequest;
    	validate_store(ApiKeyRequest, 'ApiKeyRequest');
    	component_subscribe($$self, ApiKeyRequest, $$value => $$invalidate(0, $ApiKeyRequest = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		URLSended,
    		ApiKey,
    		ApiKeyRequest,
    		uri,
    		Fotter,
    		Header,
    		ApiKeyView,
    		CreateLogger,
    		LoggerView,
    		LoggerList,
    		$ApiKeyRequest
    	});

    	return [$ApiKeyRequest];
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
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map

import DiscoveryController from 'discourse/controllers/discovery';
import DiscoveryRoute from 'discourse/routes/discovery';
import NavigationBar from 'discourse/components/navigation-bar';
import NavigationItem from 'discourse/components/navigation-item';
import Sidebars from '../mixins/sidebars';
import { on, observes, default as computed } from 'ember-addons/ember-computed-decorators';
import { settingEnabled } from '../lib/settings';
import { getOwner } from 'discourse-common/lib/get-owner';

export default {
  name: 'sidebar-discovery-edits',
  initialize(container){
    const site = container.lookup('site:main');
    const siteSettings = container.lookup('site-settings:main');

    if (site.mobileView && !siteSettings.layouts_mobile_enabled || !siteSettings.layouts_enabled) { return; }

    DiscoveryRoute.reopen({
      renderTemplate() {
        this.render('sidebar-wrapper');
      }
    });

    DiscoveryController.reopen(Sidebars, {
      mainContent: 'discovery',
      navigationDefault: Ember.inject.controller('navigation/default'),
      navigationCategories: Ember.inject.controller('navigation/categories'),
      navigationCategory: Ember.inject.controller("navigation/category"),
      showCategoryAdmin: Ember.computed.alias('navigationCategories.showCategoryAdmin'),

      @on('init')
      @observes('path')
      discoveryDomEdits() {
        const path = this.get('path');
        if (!path || path === 'discovery.loading') { return; }

        // necessary because discovery categories component does not use skipHeader
        if (this.get('headerDisabled')) {
          Ember.run.scheduleOnce('afterRender', function() {
            $('.main-content thead').hide();
          });
        }
      },

      @computed('navigationDefault.filterMode', 'navigationCategory.filterMode')
      filter(defaultFilterMode, categoryFilterMode) {
        let filterMode = defaultFilterMode || categoryFilterMode,
            filterArr = filterMode ? filterMode.split('/') : [];
        return filterArr[filterArr.length - 1];
      },

      @computed('path')
      navigationDisabled() {
        return settingEnabled('layouts_list_navigation_disabled', this.get('category'), this.get('path'));
      },

      @computed('path')
      headerDisabled() {
        return settingEnabled('layouts_list_header_disabled', this.get('category'), this.get('path'));
      },

      @computed('path')
      navMenuEnabled() {
        return settingEnabled('layouts_list_nav_menu', this.get('category'), this.get('path'));
      },

      @computed('currentUser')
      showCategoryEditBtn(currentUser) {
        if (!currentUser) return false;
        return currentUser.admin ||
        (Discourse.SiteSettings.allow_moderators_to_create_categories &&
        currentUser.moderator);
      },

      actions: {
        createCategory() {
          const navigationCategories = this.get('navigationCategories');
          navigationCategories.send('createCategory');
        },

        reorderCategories() {
          const navigationCategories = this.get('navigationCategories');
          navigationCategories.send('reorderCategories');
        }
      }
    });

    NavigationBar.reopen({
      @computed('navItems')
      navMenuEnabled(){
        return getOwner(this).lookup('controller:discovery').get('navMenuEnabled');
      }
    });

    NavigationItem.reopen({
      buildBuffer(buffer){
        const content = this.get('content');
        const linkDisabled = this.get('linkDisabled');
        let attrs = linkDisabled ? '' : "href='" + content.get('href') + "'";

        buffer.push(`<a ${attrs}>`);
        if (content.get('hasIcon')) {
          buffer.push("<span class='" + content.get('name') + "'></span>");
        }

        buffer.push(this.get('content.displayName'));
        buffer.push("</a>");
      }
    });
  }
};

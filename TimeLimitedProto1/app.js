var TimeLimited = (function () {
    function TimeLimited() {
        this.viewModel = new ViewModel();
        this.updateElapsedTime();
        this.start();
    }
    TimeLimited.prototype.updateElapsedTime = function () {
        this.viewModel.OnTimeRefresh();
    };

    TimeLimited.prototype.start = function () {
        var _this = this;
        this.timerToken = setInterval(function () {
            return _this.updateElapsedTime();
        });
    };

    TimeLimited.prototype.stop = function () {
        clearTimeout(this.timerToken);
    };
    return TimeLimited;
})();

var TimeActiveViewModel = (function () {
    function TimeActiveViewModel(name) {
        this.ActiveTime = ko.observable();
        this.CumulativeActiveTime = ko.observable();
        this.IsActive = ko.observable();
        this.Name = ko.observable();
        this.ActiveCategoryCSS = ko.observable();
        this._recorder = new TimeActiveRecorder(name);
        this.ModelChanged();
    }
    TimeActiveViewModel.prototype.ModelChanged = function () {
        this.ActiveTime(moment(this._recorder.GetTimeActive(moment())).format("mm:ss"));
        this.CumulativeActiveTime(moment(this._recorder.GetCumulativeTimeActive(moment())).format("mm:ss"));
        this.IsActive(this._recorder.IsActive());
        this.Name(this._recorder.name);
        this.ActiveCategoryCSS(this._recorder.IsActive() ? "btn-danger" : "");
    };
    TimeActiveViewModel.prototype.OnClick = function () {
        this._recorder.Activate(moment());
        this.ModelChanged();
    };
    TimeActiveViewModel.prototype.OtherRecorderClicked = function () {
        this._recorder.Deactivate(moment());
        this.ModelChanged();
    };
    return TimeActiveViewModel;
})();

var TimeActiveRecorder = (function () {
    function TimeActiveRecorder(name) {
        this._timeActivate = 0;
        this._cumulativeTimeActivate = 0;
        this.name = name;
    }
    TimeActiveRecorder.prototype.Activate = function (now) {
        if (this.IsActive()) {
            return;
        }

        this._timeActivate = now.diff(moment(0));
    };

    TimeActiveRecorder.prototype._VerifyTimeIsMonatonicallyIncreasing = function (now) {
        if (now.diff(moment(0)) < this._timeActivate) {
            throw "Time went backwards";
        }
    };

    TimeActiveRecorder.prototype.Deactivate = function (now) {
        if (!this.IsActive()) {
            throw "Can Only Deactivate active objects";
        }
        this._VerifyTimeIsMonatonicallyIncreasing(now);
        this._cumulativeTimeActivate += now.diff(moment(this._timeActivate));
        this._timeActivate = 0;
    };

    TimeActiveRecorder.prototype.IsActive = function () {
        return this._timeActivate != 0;
    };

    TimeActiveRecorder.prototype.GetTimeActive = function (now) {
        this._VerifyTimeIsMonatonicallyIncreasing(now);
        if (!this.IsActive()) {
            return 0;
        }
        return now.diff(moment(this._timeActivate));
    };

    TimeActiveRecorder.prototype.GetCumulativeTimeActive = function (now) {
        this._VerifyTimeIsMonatonicallyIncreasing(now);
        return this._cumulativeTimeActivate + this.GetTimeActive(now);
    };
    return TimeActiveRecorder;
})();

var ViewModel = (function () {
    function ViewModel() {
        var _this = this;
        this._categoryNames = "Planning;Doing;Reviewing;Practicing;Playing;FreeStyling;Procrastinating".split(";");
        this.categories = ko.observableArray(_.map(this._categoryNames, function (cat) {
            return new TimeActiveViewModel(cat);
        }));
        this.CurrentCategoryName = ko.observable();
        this.ElapsedTime = ko.observable();
        this._procrastinating = this.categories()[this.categories().length - 1];
        this.CurrentCategory = this._procrastinating;
        this.koClickedOn = function (category) {
            return _this.clickedOn(category);
        };

        this._procrastinating.OnClick();
    }
    ViewModel.prototype.ModelChanged = function () {
        this.CurrentCategoryName(this.CurrentCategory.Name());
        this.ElapsedTime(this.CurrentCategory.ActiveTime());
    };

    ViewModel.prototype.clickedOn = function (category) {
        this.CurrentCategory.OtherRecorderClicked();
        this.CurrentCategory = category;
        this.CurrentCategory.OnClick();
        this.OnTimeRefresh();
    };
    ViewModel.prototype.OnTimeRefresh = function () {
        _.forEach(this.categories(), function (category) {
            return category.ModelChanged();
        });
        this.ModelChanged();
    };
    return ViewModel;
})();

window.onload = function () {
    var app = new TimeLimited();
    ko.applyBindings(app.viewModel);
};

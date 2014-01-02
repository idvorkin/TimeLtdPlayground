/// <reference path="Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="Scripts/typings/knockout/knockout.d.ts" />
/// <reference path="Scripts/typings/moment/moment.d.ts" />
/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
class TimeLimited {
    timerToken: number;
    viewModel: ViewModel = new ViewModel();

    constructor() {
        this.updateElapsedTime();
        this.start();
    }
    // todo update timer to use RX.

    updateElapsedTime() {
        this.viewModel.OnTimeRefresh();
    }

    start() {
        this.timerToken = setInterval(() => this.updateElapsedTime());
    }

    stop() {
        clearTimeout(this.timerToken);
    }
}


// This is sloppy, need advice on how best to implement this.
class TimeActiveViewModel {
    // BUGBUG: Hour isn't working properly - find a datediff extension for JS.
    ActiveTime = ko.observable<string>();
    CumulativeActiveTime = ko.observable<string>();
    IsActive = ko.observable<Boolean>();
    Name = ko.observable<string>();
    ActiveCategoryCSS = ko.observable<string>();

    _recorder:TimeActiveRecorder;
    constructor (name:string) {
        this._recorder = new TimeActiveRecorder(name);
        this.ModelChanged();
    }

    // Call after updating the model 
    ModelChanged() {
        this.ActiveTime(moment(this._recorder.GetTimeActive(moment())).format("mm:ss"));
        this.CumulativeActiveTime(moment(this._recorder.GetCumulativeTimeActive(moment())).format("mm:ss"));
        this.IsActive(this._recorder.IsActive());
        this.Name(this._recorder.name);
        this.ActiveCategoryCSS(this._recorder.IsActive() ? "btn-danger" : "");
    }
    OnClick() {
        this._recorder.Activate(moment());
        this.ModelChanged();
    }
    OtherRecorderClicked() {
        this._recorder.Deactivate(moment());
        this.ModelChanged();
    }

}

class TimeActiveRecorder {
    name;
    // need a TimeSpan value  for 0;
    _timeActivate = 0;
    _cumulativeTimeActivate = 0;

    Activate(now: Moment) {
        // ignore active calls when active
        if (this.IsActive()) {
            return;
        }

        this._timeActivate = now.diff(moment(0));
    }

    _VerifyTimeIsMonatonicallyIncreasing(now: Moment)
    {
        // -- add this on all API's
        if (now.diff(moment(0)) < this._timeActivate) {
            throw "Time went backwards";
        }
    }

    Deactivate(now:Moment) {
        if (!this.IsActive()) {
            throw "Can Only Deactivate active objects";
        }
        this._VerifyTimeIsMonatonicallyIncreasing(now);
        this._cumulativeTimeActivate += now.diff(moment(this._timeActivate));
        this._timeActivate = 0;
    }

    IsActive() {
        return this._timeActivate != 0;
    }

    GetTimeActive(now: Moment) {
        this._VerifyTimeIsMonatonicallyIncreasing(now);
        if (!this.IsActive()) {
            return 0;
        }
        return now.diff(moment(this._timeActivate));
    }

    GetCumulativeTimeActive(now: Moment) {
        this._VerifyTimeIsMonatonicallyIncreasing(now);
        return this._cumulativeTimeActivate + this.GetTimeActive(now);
    }

    constructor(name: string) {
        this.name = name;
    }
}

class ViewModel {
    constructor() {
        this._procrastinating = this.categories()[this.categories().length - 1];
        this.CurrentCategory = this._procrastinating;
        this.koClickedOn = (category) => this.clickedOn(category);

        // default category must be clicked before it can be un-clicked.
        // RECONSIDER: this is a hack but the alternative is allowing current category to be a special not-initialized value
        // and test for it in OnClicked();
        this._procrastinating.OnClick();
    }
    ModelChanged()
    {
        this.CurrentCategoryName(this.CurrentCategory.Name());
        this.ElapsedTime(this.CurrentCategory.ActiveTime());
    }
    _categoryNames = "Planning;Doing;Reviewing;Practicing;Playing;FreeStyling;Procrastinating".split(";");
    categories = ko.observableArray(_.map(this._categoryNames, (cat) => new TimeActiveViewModel(cat)));
    _procrastinating:TimeActiveViewModel;
    CurrentCategory:TimeActiveViewModel;
    CurrentCategoryName = ko.observable<string>()
    ElapsedTime = ko.observable<string>();
    koClickedOn;
    clickedOn(category) {
        this.CurrentCategory.OtherRecorderClicked();
        this.CurrentCategory = category;
        this.CurrentCategory.OnClick();
        this.OnTimeRefresh();
    }
    OnTimeRefresh() {
        _.forEach(this.categories(), category=> category.ModelChanged());
        this.ModelChanged();
    }
}

window.onload = () => {
    var app = new TimeLimited();
    ko.applyBindings(app.viewModel);
};
